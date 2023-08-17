// Import necessary modules
const express = require('express');
const bcrypt = require('bcrypt');
const UserModel = require('../models/user');

// Initialize the router and a store for login attempts
var router = express.Router();
let loginAttempts = {};

// Define the GET route handler for login page
router.get("/", (req, res) => {
  const user = req.session.user;

  // If there's no user in session, render the login page
  if(!user)
    res.render("login", { error: null, user: user });
  else
    // If the user is already logged in, redirect to home
    res.redirect("/")
});

// Define the POST route handler for logging in
router.post("/", async (req, res) => {
  const email = req.body.email;

  // Fetch the user based on provided email from database
  const user = await UserModel.findOne({ email });

  // If the user is not found, render an error
  if (user == null) {
    return res.render("login", {
      error: "This Username or Email does not exist",
    });
  }

  try {
    // Compare provided password with stored hashed password
    if (await bcrypt.compare(req.body.password, user.password)) {
      // Set the user in session after successful login
      req.session.user = user;

      // Redirect based on user role
      if (user.role === "Owner") {
        res.redirect("/properties");
      } else {
        res.redirect("/");
      }
    } else {
      // On incorrect password, update or set the login attempt count
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;

      // If more than 2 login attempts, block user for 10 second
      if (loginAttempts[email] > 2) {
        setTimeout(() => {
          loginAttempts[email] = 0;
        }, 10000);

        return res.render("login", {
          error: "Too many attempts. Please try again later.",
        });
      } else {
        // Render error on incorrect password
        return res.render("login", { error: "Incorrect password." });
      }
    }
  } catch {
    // On any other error, render a general error message
    res.render("login", {
      error: "Something went wrong. Please try again later.",
    });
  }
});

// Export the router to be used in the main server file
module.exports = router;
