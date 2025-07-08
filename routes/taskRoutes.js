const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

// ✅ All routes protected
router.get("/", authMiddleware, getTasks);             // Fetch all tasks
router.post("/", authMiddleware, createTask);          // Create new task
router.put("/:id", authMiddleware, updateTask);        // Update (with version conflict)
router.delete("/:id", authMiddleware, deleteTask);     // Delete task

// 🧠 Optional placeholder routes you may enable later:
// router.post("/assign-smart", authMiddleware, smartAssign);
// router.put("/drag/:id", authMiddleware, updateTaskStatusOnDrag);

module.exports = router;
