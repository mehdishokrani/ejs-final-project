// Required modules
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const { v4: uuidv4 } = require("uuid");
<<<<<<< HEAD

// Middleware for owner login checks
const { checkOwner, checkLoggedIn } = require("../public/owner_login_check");

// Database models for Property and Workspaces
const PropertyModel = require("../models/property");
const WorkspaceModel = require('../models/workspaces');

// Define the directory to save uploaded files
const uploadDirectory = path.join(__dirname, "../uploads");

// Check if the upload directory exists, create it if not
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

// Middleware setup for file uploading
const upload = multer({ dest: "uploads/" });


// Get property list
router.get("/", checkLoggedIn, async (req, res) => {
    try {
        // Check if the logged in user is an Owner
        const isOwner = req.session.user && req.session.user.role === "Owner";
        
        let properties;
        if (isOwner) {
          // For Owners: Fetch only their own properties
          properties = await PropertyModel.find({ ownerId: req.session.user._id }).exec();
        } else {
          // For non-Owners: Currently, fetches no properties (can be updated based on requirements)
          properties = [];
        }
    
        // Fetch associated workspaces for the properties
        const propertiesWithWorkspaces = await Promise.all(
          properties.map(async (property) => {
            const workspaces = await WorkspaceModel.find({ propertyId: property._id }).exec();
            property.workspaces = workspaces;
            return property;
          })
        );

        res.render("properties", { properties: propertiesWithWorkspaces, user: req.session.user });
      } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
      }
=======
const {
  checkOwner,
  checkLoggedIn
} = require("../public/owner_login_check");
const PropertyModel = require("../models/property");
const WorkspaceModel = require('../models/workspaces');

// Google Cloud Storage setup
const storage = new Storage({
  projectId: 'coworker-v-0-0-1',
  keyFilename: './coworker-v-0-0-2-6def27e3c56d.json'
>>>>>>> 13230f20d6133c3575aed169a87905f4e5d4f4f3
});
const bucketName = "coworker-v-0-0-2.appspot.com"; 
const bucket = storage.bucket(bucketName);

<<<<<<< HEAD
// Render form to create a new property
=======
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

const getPublicUrl = (filename) => {
  return `https://storage.googleapis.com/${bucketName}/${filename}`;
}
// create new property
>>>>>>> 13230f20d6133c3575aed169a87905f4e5d4f4f3
router.get("/new", checkLoggedIn, checkOwner, (req, res) => {
    res.render("property-new", { user: req.session.user });
});

// Handle form submission to create a new property

router.post(
  "/new",
  checkLoggedIn,
  checkOwner,
  upload.single("image"),
  async (req, res) => {
    let imageUrl = "";

    if (req.file) {
      const blob = bucket.file(uuidv4() + req.file.originalname);
      const blobStream = blob.createWriteStream();

      blobStream.on('error', err => {
        console.error(err);
        return res.status(500).send("Unable to upload image.");
      });

      blobStream.on('finish', async () => {
        imageUrl = getPublicUrl(blob.name);

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
  });

  blobStream.end(req.file.buffer);
} else {
  // Handle the case where there's no file uploaded.
  // ... your code ...
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
