// routes/reviews.js

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const { checkLoggedIn, checkCoworker } = require("../public/owner_login_check");
const ReviewModel = require("../models/review");
const WorkspaceModel = require("../models/workspaces");

// Show the form for creating a new Review
router.get('/new/:workspaceId', checkLoggedIn, checkCoworker, async (req, res) => {
    try {
      const workspaceId = req.params.workspaceId;
      res.render('add_review', { workspaceId: workspaceId });
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
});

// Create a new Review
router.post('/new', checkLoggedIn, checkCoworker, async (req, res) => {
    try {
      const review = new ReviewModel({
        _id: uuidv4(),
        workspaceId: req.body.workspaceId,
        coworkerId: req.session.user._id,
        rating: req.body.rating,
        comment: req.body.comment,
      });
  
      await review.save();
  
      // Fetch the workspace
      const workspace = await WorkspaceModel.findById(req.body.workspaceId);
  
      if (!workspace) {
        res.status(404).send('Workspace not found');
        return;
      }
  
      // Add the new review to the workspace's reviews
      workspace.reviews.push(review._id);
  
      // Save the updated workspace
      await workspace.save();
  
      res.redirect('/'); // Redirect to appropriate route after successful creation
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
