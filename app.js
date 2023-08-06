const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const signupRouter = require("./routes/signup");
const loginRouter = require("./routes/login");

const {
  checkOwner,
  checkCoworker,
  checkLoggedIn,
} = require("./public/owner_login_check");

mongoose
  .connect("mongodb://127.0.0.1:27017/Coworker-v-1")
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

const Schema = mongoose.Schema;
const uploadDirectory = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const upload = multer({ dest: "uploads/" });
const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

app.set("view engine", "ejs");
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
let users = [];

const PropertySchema = new Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    ownerId: { type: String, ref: "User" },
    address1: String,
    address2: String,
    city: String,
    state: String,
    postalcode: String,
    neighborhood: String,
    sqft: { type: Number, min: 1 },
    parking: String,
    publicTrans: String,
    imageUrl: String,
    workspaces: Array,
  },
  { timestamps: true }
);

const WorkspaceSchema = new Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    propertyId: String,
    type: String,
    seats: { type: Number, min: 1 },
    smoking: String,
    availability: Date,
    lease: String,
    price: { type: Number, min: 1 },
    hasAirConditioner: String,
    printer: String,
    landline: String,
    hasOnsiteGym: String,
    parking: String,
    imageUrl: String,
    reviews: [{ type: String, ref: "Review" }],
  },
  { timestamps: true }
);

const ReviewSchema = new Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    workspaceId: String,
    coworkerId: { type: String, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
  },
  { timestamps: true }
);

const UserModel = require("./models/user");
const PropertyModel = mongoose.model("Property", PropertySchema);
const WorkspaceModel = mongoose.model("Workspace", WorkspaceSchema);
const ReviewModel = mongoose.model("Review", ReviewSchema);



app.get("/", async (req, res) => {
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

    //console.log({ workspaces: workspaces, properties: properties, user: user, workspace: workspace, owner: owner });
      console.log(propertyToOwner)
    // Pass the user, the selected workspace and the owner to the template
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

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}


app.use("/signup", signupRouter);
app.use("/login", loginRouter);

app.use(async (req, res, next) => {
  if (!req.session.user && !["/login", "/signup"].includes(req.path)) {
    return res.redirect("/login");
  }
  next();
});

// Show the form for creating a new Review
app.get(
  "/reviews/new/:workspaceId",
  checkLoggedIn,
  checkCoworker,
  async (req, res) => {
    try {
      const workspaceId = req.params.workspaceId;
      res.render("add_review", { workspaceId: workspaceId });
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Create a new Review
// Create a new Review
app.post("/reviews/new", checkLoggedIn, checkCoworker, async (req, res) => {
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
      res.status(404).send("Workspace not found");
      return;
    }

    // Add the new review to the workspace's reviews
    workspace.reviews.push(review._id);

    // Save the updated workspace
    await workspace.save();

    res.redirect("/"); // Redirect to appropriate route after successful creation
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/workspace/:workspaceId/comments", async (req, res) => {
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
    res.render("comments", { workspace: workspace });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

app.get("/properties", checkLoggedIn, async (req, res) => {
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
      properties = await PropertyModel.find().exec();
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

    res.render("properties", { properties: propertiesWithWorkspaces });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/properties/new", checkLoggedIn, checkOwner, (req, res) => {
  res.render("property-new");
});

app.post(
  "/properties/new",
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
      res.redirect("/properties");
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.get(
  "/properties/:propertyId/edit",
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

      res.render("property-edit", { property: property });
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.post(
  "/properties/:propertyId/edit",
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

app.post("/properties/:propertyId/delete", async (req, res) => {
  console.log("START OF DELETE");
  try {
    console.log("INSIDE DELETE");
    const propertyId = req.params.propertyId;
    console.log("Delete property with ID:", propertyId);

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

    console.log(
      "All workspaces with propertyId:",
      propertyId,
      "deleted successfully"
    );

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

app.get("/properties/:propertyId/workspaces", checkOwner, async (req, res) => {
  try {
    // ... existing code ...
    const workspaces = await WorkspaceModel.find({
      propertyId: req.params.propertyId,
    }).exec();

    if (!Array.isArray(workspaces)) {
      console.log(
        "Workspaces is not an array. Instead, it is a(n)",
        typeof workspaces
      );
    } else {
      console.log("Number of workspaces:", workspaces.length);
    }

    res.render("workspaces", {
      propertyId: req.params.propertyId,
      workspaces: workspaces,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

app.get("/properties/:propertyId/workspaces/new", checkOwner, (req, res) => {
  const propertyId = req.params.propertyId;
  res.render("workspace-new", { propertyId });
});

app.post(
  "/properties/:propertyId/workspaces/new",
  upload.single("image"),
  checkOwner,
  async (req, res) => {
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
  }
);

app.get(
  "/properties/:propertyId/workspaces/:workspaceId/edit",
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
        ...workspaceObj,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  }
);

app.post(
  "/properties/:propertyId/workspaces/:workspaceId/edit",
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

app.post(
  "/properties/:propertyId/workspaces/:workspaceId/delete",
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

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
