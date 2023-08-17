const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const {
  checkOwner,
  checkLoggedIn
} = require("../public/owner_login_check");

const PropertyModel = require("../models/property");
const WorkspaceModel = require('../models/workspaces');
const uploadDirectory = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const upload = multer({ dest: "uploads/" });

// property-related routes goes here

// get property list
router.get("/", checkLoggedIn, async (req, res) => {
    try {
        // Check if the user is an Owner
        const isOwner = req.session.user && req.session.user.role === "Owner";
    
        let properties;
        if (isOwner) {
          // If the user is an Owner, fetch only their own properties
          properties = await PropertyModel.find({
            ownerId: req.session.user._id,
          }).exec();
        } else {
          // If the user is not an Owner, fetch all properties (assuming other roles can view all properties)
          //properties = await PropertyModel.find().exec();
          properties = []
        }
    
        const propertiesWithWorkspaces = await Promise.all(
          properties.map(async (property) => {
            const workspaces = await WorkspaceModel.find({
              propertyId: property._id,
            }).exec();
            // Attach the workspaces to the property
            property.workspaces = workspaces;
            return property;
          })
        );
        const user = req.session.user;
        res.render("properties", { properties: propertiesWithWorkspaces, user:user });
      } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
      }
});

// create new property
router.get("/new", checkLoggedIn, checkOwner, (req, res) => {
  const user = req.session.user;
    res.render("property-new",{user:user});
});

router.post(
  "/new",
  checkLoggedIn,
  checkOwner,
  upload.single("image"),
  async (req, res) => {
    let imageUrl = "";

    if (req.file) {
      imageUrl = path.join("uploads", req.file.filename);
    }

    try {
      const property = new PropertyModel({
        ownerId: req.session.user._id,
        address1: req.body.address1,
        address2: req.body.address2,
        city: req.body.city,
        state: req.body.state,
        postalcode: req.body.postalcode,
        neighborhood: req.body.neighborhood,
        sqft: req.body.sqft,
        parking: req.body.parking,
        publicTrans: req.body.publicTrans,
        imageUrl: imageUrl,
      });

      await property.save();
      const user = req.session.user;
      res.redirect("/properties",{user:user});
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// update property
router.get(
  "/:propertyId/edit",
  checkLoggedIn,
  checkOwner,
  async (req, res) => {
    try {
        const property = await PropertyModel.findOne({
          _id: req.params.propertyId,
          ownerId: req.session.user._id,
        }).exec();
  
        if (property == null) {
          return res.status(404).send("Property not found");
        }
        const user = req.session.user;
        res.render("property-edit", { property: property,user:user });
      } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
      }
  }
);

router.post(
  "/:propertyId/edit",
  checkLoggedIn,
  checkOwner,
  upload.single("image"),
  async (req, res) => {
    try {
        const property = await PropertyModel.findOne({
          _id: req.params.propertyId,
          ownerId: req.session.user._id,
        }).exec();
  
        if (property == null) {
          return res.status(404).send("Property not found");
        }
  
        if (req.file) {
          property.imageUrl = path.join("uploads", req.file.filename);
        }
  
        property.address1 = req.body.address1;
        property.address2 = req.body.address2;
        property.city = req.body.city;
        property.state = req.body.state;
        property.postalcode = req.body.postalcode;
        property.neighborhood = req.body.neighborhood;
        property.sqft = req.body.sqft;
        property.parking = req.body.parking;
        property.publicTrans = req.body.publicTrans;
  
        await property.save();
        res.redirect("/properties");
      } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
      }
  }
);

// delete property
router.post("/:propertyId/delete", async (req, res) => {
    try {
        const propertyId = req.params.propertyId;
    
        // Find the property
        const property = await PropertyModel.findOne({
          _id: propertyId,
          ownerId: req.session.user._id,
        });
    
        if (!property) {
          console.log("Property not found, nothing deleted");
          return res.status(404).send("Property not found");
        }
    
        // Find all the workspaces related to the property
        const workspacesToDelete = await WorkspaceModel.find({
          propertyId: propertyId,
        });
    
        // Delete associated images from the file system and remove each workspace
        for (const workspace of workspacesToDelete) {
          if (workspace.imageUrl) {
            try {
              fs.unlinkSync(path.join(uploadDirectory, workspace.imageUrl));
            } catch (err) {
              console.error(err);
            }
          }
        }
        await WorkspaceModel.deleteMany({ propertyId: propertyId });
    
    
        // Finally, remove the property after deleting the workspaces
        await PropertyModel.findOneAndDelete({
          _id: propertyId,
          ownerId: req.session.user._id,
        });
    
        console.log("Property and associated workspaces deleted successfully");
        res.redirect("/properties");
      } catch (err) {
        console.log("Error during deletion:", err);
        res.status(500).send("Internal server error");
      }
});

router.get("/:propertyId/workspaces", checkOwner, async (req, res) => {
  try {
    // ... existing code ...
    const workspaces = await WorkspaceModel.find({
      propertyId: req.params.propertyId,
    }).exec();
    res.render("workspaces", {
      propertyId: req.params.propertyId,
      workspaces: workspaces, user:req.session.user
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});


router.post(
  "/:propertyId/workspaces/:workspaceId/delete",
  checkOwner,
  async (req, res) => {
    try {
      const property = await PropertyModel.findOne({
        _id: req.params.propertyId,
        ownerId: req.session.user._id,
      });

      if (!property) {
        return res.status(404).send("Property not found");
      }

      const workspace = await WorkspaceModel.findOneAndDelete({
        _id: req.params.workspaceId,
        propertyId: req.params.propertyId,
      });

      if (!workspace) {
        return res.status(404).send("Workspace not found");
      }

      if (workspace.imageUrl) {
        try {
          fs.unlinkSync(path.join(uploadDirectory, workspace.imageUrl));
        } catch (err) {
          console.error(err);
        }
      }

      res.redirect("/properties/" + req.params.propertyId + "/workspaces");
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal server error");
    }
  }
);


router.get(
  "/:propertyId/workspaces/:workspaceId/edit",
  checkOwner,
  async (req, res) => {
    try {
      const property = await PropertyModel.findOne({
        _id: req.params.propertyId,
        ownerId: req.session.user._id,
      });

      if (!property) {
        return res.status(404).send("Property not found");
      }

      const workspace = await WorkspaceModel.findOne({
        _id: req.params.workspaceId,
        propertyId: req.params.propertyId,
      });

      if (!workspace) {
        return res.status(404).send("Workspace not found");
      }

      const workspaceObj = workspace.toObject();

      workspaceObj.defaultType = workspaceObj.type;
      workspaceObj.defaultSeats = workspaceObj.seats;
      workspaceObj.defaultSmoking =
        workspaceObj.smoking === "yes" ? "yes" : "no";
      workspaceObj.defaultAvailability = workspaceObj.availability;
      workspaceObj.defaultLease = workspaceObj.lease;
      workspaceObj.defaultPrice = workspaceObj.price;
      workspaceObj.defaultHasAirConditioner =
        workspaceObj.hasAirConditioner === "yes" ? "yes" : "no";
      workspaceObj.defaultPrinter = workspaceObj.printer;
      workspaceObj.defaultLandline = workspaceObj.landline;
      workspaceObj.defaultHasOnsiteGym =
        workspaceObj.hasOnsiteGym === "yes" ? "yes" : "no";
      workspaceObj.defaultParking = workspaceObj.parking;

      res.render("workspace-edit", {
        propertyId: req.params.propertyId,
        workspaceId: req.params.workspaceId,
        user:req.session.user,
        ...workspaceObj,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  }
);

router.post(
  "/:propertyId/workspaces/:workspaceId/edit",
  upload.single("image"),
  checkOwner,
  async (req, res) => {
    try {
      const property = await PropertyModel.findOne({
        _id: req.params.propertyId,
        ownerId: req.session.user._id,
      });

      if (!property) {
        return res.status(404).send("Property not found");
      }

      const workspace = await WorkspaceModel.findOne({
        _id: req.params.workspaceId,
        propertyId: req.params.propertyId,
      });

      if (!workspace) {
        return res.status(404).send("Workspace not found");
      }

      workspace.type = req.body.type;
      workspace.seats = req.body.seats;
      workspace.smoking = req.body.smoking === "yes";
      workspace.availability = req.body.availability;
      workspace.lease = req.body.lease;
      workspace.price = req.body.price;
      workspace.hasAirConditioner = req.body.hasAirConditioner === "yes";
      workspace.printer = req.body.printer;
      workspace.landline = req.body.landline;
      workspace.hasOnsiteGym = req.body.hasOnsiteGym === "yes";
      workspace.parking = req.body.parking;

      if (req.file) {
        const imagePath = path.join(uploadDirectory, workspace.imageUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlink(imagePath, (err) => {
            if (err) {
              console.error("Error while unlinking the image:", err);
            }
          });
        }
        workspace.imageUrl = req.file.filename;
      }

      await workspace.save();

      res.redirect(`/properties/${req.params.propertyId}/workspaces`);
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal server error");
    }
  }
);



router.get("/:propertyId/workspaces/new", checkOwner, (req, res) => { 
  const propertyId = req.params.propertyId;
res.render("workspace-new", { propertyId,user:req.session.user });
});

router.post("/:propertyId/workspaces/new", upload.single("image"), checkOwner, async (req, res) => { 
  let imageUrl = "";
  if (req.file) {
    imageUrl = "/uploads/" + req.file.filename;
  }
  try {
    const workspace = new WorkspaceModel({
      propertyId: req.params.propertyId,
      type: req.body.type,
      seats: req.body.seats,
      smoking: req.body.smoking === "yes",
      availability: req.body.availability,
      lease: req.body.lease,
      price: req.body.price,
      hasAirConditioner: req.body.hasAirConditioner === "yes",
      printer: req.body.printer,
      landline: req.body.landline,
      hasOnsiteGym: req.body.hasOnsiteGym === "yes",
      parking: req.body.parking,
      imageUrl: imageUrl,
    });

    await workspace.save();
    res.redirect("/properties/" + req.params.propertyId + "/workspaces");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
