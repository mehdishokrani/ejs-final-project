// Import necessary modules
const express = require('express');
const UserModel = require("../models/user");
const PropertyModel = require("../models/property");
const WorkspaceModel = require("../models/workspaces");
const ReviewModel = require("../models/review");

// Create a new router instance
const router = express.Router();

// Define the main route handler for the home page
router.get('/', async (req, res) => {
    try {
        // Fetch all workspaces from the database
        let workspaces = await WorkspaceModel.find().exec();

        // Extract all property IDs associated with the workspaces
        const workspaceIds = workspaces.map((workspace) => workspace.propertyId);

        // Fetch properties that match the extracted workspace IDs
        let properties = await PropertyModel.find({
          _id: { $in: workspaceIds },
        }).exec();
    
        // Extract the user from the session
        const user = req.session.user;

        let workspace;
        let owner;

        // Initialize a mapping object from properties to their owners
        const propertyToOwner = {};

        // Check if the user is logged in as a Coworker or Owner and if there are properties fetched
        if (user && (user.role === "Coworker" || user.role === "Owner") && properties.length > 0) {
          // Extract the owner IDs from the fetched properties
          const ownerIds = properties.map(property => property.ownerId);
            
          // Fetch user details for the extracted owner IDs with a role of Owner
          const owners = await UserModel.find({ _id: { $in: ownerIds }, role: "Owner" }).exec();
        
          // Create a map linking properties to their owners
          properties.forEach(property => {
            const owner = owners.find(owner => owner._id.toString() === property.ownerId.toString());
            propertyToOwner[property._id.toString()] = owner;
          });

        }

        // Calculate the average rating for each workspace
        workspaces = await Promise.all(
          workspaces.map(async (workspace) => {
            // Fetch all reviews associated with a workspace
            const reviews = await ReviewModel.find({
              workspaceId: workspace._id,
            }).exec();

            let avgRating;

            // Calculate average rating if there are reviews
            if (Array.isArray(reviews) && reviews.length) {
              let sum = reviews.reduce((a, b) => a + b.rating, 0);
              avgRating = sum / reviews.length;
            } else {
              avgRating = "Nothing";
            }
    
            return { ...workspace.toObject(), avgRating };
          })
        );

        // Render the home page view with the fetched data
        res.render("home", {
          workspaces: workspaces,
          properties: properties,
          user: user,
          workspace: workspace,
          propertyToOwner: propertyToOwner,
        });
    } catch (err) {
        // Handle errors and send a 500 status
        console.error(err);
<<<<<<< HEAD
        res.status(500).send("Internal server error");
    }
=======
        res.status(500).send("Internal server error I can not open this");
      }
>>>>>>> 13230f20d6133c3575aed169a87905f4e5d4f4f3
});

// Define the route handler for the logout functionality
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if(err) {
          return res.redirect('/');
      }

      // Clear the session cookie after successful logout
      res.clearCookie('session-id');
      
      // Redirect the user to the home page
      res.redirect('/');
  });
});

// Export the router to be used in the main server file
module.exports = router;
