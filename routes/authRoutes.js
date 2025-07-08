const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const User = require("../models/User");

// Auth routes
router.post("/register", register);
router.post("/login", login);

// Expose user list
router.get("/users", async (req, res) => {
  const users = await User.find({}, "_id username");
  res.json(users);
});

module.exports = router;
