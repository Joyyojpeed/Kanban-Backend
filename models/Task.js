const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, },
  status: {
    type: String,
    enum: ["Todo", "In Progress", "Done"],
    default: "Todo",
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },
  lastModified: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
});

module.exports = mongoose.model("Task", taskSchema);
