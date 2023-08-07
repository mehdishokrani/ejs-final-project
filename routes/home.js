const express = require('express');
const UserModel = require("../models/user");
const PropertyModel = require("../models/property")
const WorkspaceModel = require("../models/workspaces")
const ReviewModel = require("../models/review")

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        let workspaces = await WorkspaceModel.find().exec();
        const workspaceIds = workspaces.map((workspace) => workspace.propertyId);
        let properties = await PropertyModel.find({
          _id: { $in: workspaceIds },
        }).exec();
    
    
        const user = req.session.user; // Get the user from the session
    
        let workspace;
        let owner;
        const propertyToOwner = {};
        // Fetch the owner details if the user is logged in as a coworker and a workspace is selected
        if (user && user.role === "Coworker" && properties.length>0) {
          // Extract the ownerId's from properties
          const ownerIds = properties.map(property => property.ownerId);
            
          // Fetch the owners
          const owners = await UserModel.find({ _id: { $in: ownerIds }, role: "Owner" }).exec();
        
          // Make a mapping of property id to owner
          
          properties.forEach(property => {
            const owner = owners.find(owner => owner._id.toString() === property.ownerId.toString());
            propertyToOwner[property._id.toString()] = owner;
          });
        
          console.log(`property to owners: `, propertyToOwner);
        }
        
    
        // Calculate average ratings for each workspace
        workspaces = await Promise.all(
          workspaces.map(async (workspace) => {
            const reviews = await ReviewModel.find({
              workspaceId: workspace._id,
            }).exec();
            let avgRating;
            if (Array.isArray(reviews) && reviews.length) {
              let sum = reviews.reduce((a, b) => a + b.rating, 0);
              avgRating = sum / reviews.length;
            } else {
              avgRating = "Nothing";
            }
    
            return { ...workspace.toObject(), avgRating };
          })
        );
        console.log(propertyToOwner)
        res.render("home", {
          workspaces: workspaces,
          properties: properties,
          user: user,
          workspace: workspace,
          propertyToOwner: propertyToOwner,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
      }
});

module.exports = router;
