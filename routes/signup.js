const express = require("express");
const bcrypt = require("bcrypt");
const UserModel = require("../models/user");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("signup", { error: null });
});

router.post("/", async (req, res) => {
  try {
    // Get the form input
    const { name, phoneNumber, email, role, password } = req.body;

    // Validate input
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const nameRegex = /^[A-Za-z\s]+$/;

    if (password.length < 8) {
      return res.render("signup", {
        error: "Password must be at least 8 characters long.",
      });
    }

    if (name.length < 3 || !nameRegex.test(name)) {
      return res.render("signup", {
        error:
          "Name must be at least 3 characters long and only contain alphabet characters or spaces.",
      });
    }

    if (phoneNumber.length < 8 || isNaN(phoneNumber)) {
      return res.render("signup", {
        error: "Phone number must be at least 8 digits.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.render("signup", {
        error: "Email must be valid and end with a valid domain extension.",
      });
    }

    // Check if role is either 'Owner' or 'Coworker'
    if (!["Owner", "Coworker"].includes(role)) {
      return res.render("signup", {
        error: 'Role must be either "Owner" or "Coworker"',
      });
    }

    // Check if email already exists in the database
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.render("signup", { error: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new UserModel({
      name,
      phone: phoneNumber,
      email,
      role,
      password: hashedPassword,
    });

    // Save user to the database
    await user.save();

    // Redirect to login page
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.redirect("/signup");
  }
});

module.exports = router;
