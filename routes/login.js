const express = require('express');
const bcrypt = require('bcrypt');
const UserModel = require('../models/user');

var router = express.Router();
let loginAttempts = {};

router.get("/", (req, res) => {
    res.render("login", { error: null });
});

// router.post("/", async (req, res) => {
//     res.render("login", { error: null });
// });

router.post("/", async (req, res) => {
  const email = req.body.email;

  // Fetch user from database
  const user = await UserModel.findOne({ email });

  if (user == null) {
    return res.render("login", {
      error: "This Username or Email does not exist",
    });
  }

  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      req.session.user = user;
      if (user.role === "Owner") {
        res.redirect("/properties");
      } else {
        res.redirect("/");
      }
    } else {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;

      if (loginAttempts[email] > 2) {
        setTimeout(() => {
          loginAttempts[email] = 0;
        }, 1000 * 60 * 60);

        return res.render("login", {
          error: "Too many attempts. Please try again later.",
        });
      } else {
        return res.render("login", { error: "Incorrect password." });
      }
    }
  } catch {
    res.render("login", {
      error: "Something went wrong. Please try again later.",
    });
  }
});

module.exports = router;

