const express = require('express');
const router = express.Router();
const { checkOwner, checkLoggedIn, checkCoworker } = require("../public/owner_login_check");
const multer = require('multer');
const path = require('path');
const WorkspaceModel = require("../models/workspaces");
const PropertyModel = require("../models/property");
const ReviewModel = require("../models/review");

const uploadDirectory = path.join(__dirname, "../uploads");
const upload = multer({ dest: uploadDirectory });


router.get("/:workspaceId/comments", async (req, res) => { 
  try {
      const workspaceId = req.params.workspaceId;
      const workspace = await WorkspaceModel.findById(workspaceId).populate({
        path: "reviews", // populate reviews
        populate: {
          path: "coworkerId", // in reviews, populate coworkerId
          model: "User", // the model to use
        },
      });
  
      // Now each review object in workspace.reviews array should have a coworkerId object with the user's details including name
      res.render("comments", { workspace: workspace,user:req.session.user });
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal server error");
    }
});


module.exports = router;
