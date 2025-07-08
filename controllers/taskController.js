// server/controllers/taskController.js
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const { getIO } = require("../socket");
const User = require("../models/User");
const AssignCounter = require("../models/AssignCounter");

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "username");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, status, assignedTo } = req.body;
    const currentUserId = req.user?.id;

    if (["Todo", "In Progress", "Done"].includes(title.trim())) {
      return res.status(400).json({ msg: "Task title cannot be a column name" });
    }

    const exists = await Task.findOne({ title });
    if (exists) return res.status(400).json({ msg: "Task title must be unique" });

    const newTask = new Task({
      title,
      description,
      priority,
      status,
      version: 1,
      lastModified: new Date(),
    });

    // SMART ASSIGN
    if (!assignedTo) {
      const users = await User.find();
      if (!users.length) return res.status(400).json({ msg: "No users to assign" });

      const taskCounts = await Promise.all(
        users.map(async (u) => ({
          user: u,
          count: await Task.countDocuments({ assignedTo: u._id, status: { $ne: "Done" } }),
        }))
      );

      const minCount = Math.min(...taskCounts.map((t) => t.count));
      const leastLoaded = taskCounts.filter((t) => t.count === minCount).map((t) => t.user);

      let counter = await AssignCounter.findOne({ key: "smartAssignIndex" });
      if (!counter) {
        counter = await AssignCounter.create({ key: "smartAssignIndex", value: 0 });
      }

      const index = counter.value % leastLoaded.length;
      newTask.assignedTo = leastLoaded[index]._id;

      counter.value += 1;
      await counter.save();
    } else {
      newTask.assignedTo = assignedTo;
    }

    await newTask.save();
    const populated = await newTask.populate("assignedTo", "username");

    const activity = await Activity.create({
      type: "created",
      task: newTask._id,
      user: currentUserId, // ✅ Make sure we log the user
    });

    const fullActivity = await Activity.findById(activity._id)
      .populate("task", "title assignedTo")
      .populate("user", "username");

    getIO().emit("task:created", populated);
    getIO().emit("activity:log", {
      ...fullActivity.toObject(),
      timestamp: new Date(),
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to create task" });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const clientVersion = req.body.version;
    const currentUserId = req.user?.id;

    const existingTask = await Task.findById(id).populate("assignedTo", "username");
    if (!existingTask) {
      return res.status(404).json({ msg: "Task not found" });
    }

    if (clientVersion < existingTask.version) {
      return res.status(409).json({
        msg: "Version conflict",
        serverTask: existingTask,
        clientTask: req.body,
      });
    }

    const updateData = {
      ...req.body,
      version: existingTask.version + 1,
      lastModified: new Date(),
    };

    const changedFields = {};
    ["title", "description", "priority", "status", "assignedTo"].forEach((field) => {
      const oldVal = existingTask[field]?.toString();
      const newVal = req.body[field]?.toString();
      if (oldVal !== newVal) {
        changedFields[field] = {
          before: existingTask[field] || "—",
          after: req.body[field] || "—",
        };
      }
    });

    await Task.findByIdAndUpdate(id, updateData);
    const updatedTask = await Task.findById(id).populate("assignedTo", "username");

    // ✅ Safe activity logging
    if (currentUserId) {
      try {
        const activity = await Activity.create({
          type: "updated",
          task: updatedTask._id,
          user: currentUserId,
          changes: changedFields,
        });

        const fullActivity = await Activity.findById(activity._id)
          .populate("task", "title assignedTo")
          .populate("user", "username");

        getIO().emit("activity:log", {
          ...fullActivity.toObject(),
          timestamp: new Date(),
        });
      } catch (logErr) {
        console.warn("⚠️ Failed to log activity:", logErr.message);
      }
    }

    getIO().emit("task:updated", updatedTask);
    res.json(updatedTask);
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ msg: "Failed to update task" });
  }
};


exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) return res.status(404).json({ msg: "Task not found" });

    const activity = await Activity.create({
      type: "deleted",
      task: deletedTask._id,
      user: currentUserId,
    });

    const fullActivity = await Activity.findById(activity._id)
      .populate("task", "title assignedTo")
      .populate("user", "username");

    getIO().emit("task:deleted", deletedTask._id);
    getIO().emit("activity:log", {
      ...fullActivity.toObject(),
      timestamp: new Date(),
    });

    res.json({ msg: "Task deleted" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ msg: "Failed to delete task" });
  }
};
