const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .populate({
        path: "task",
        select: "title assignedTo",
        populate: { path: "assignedTo", select: "username" },
      })
      .populate("user", "username"); // ✅ Ensure we get the actor

    res.json(activities);
  } catch {
    res.status(500).json({ msg: "Failed to fetch activity log" });
  }
});


module.exports = router;
