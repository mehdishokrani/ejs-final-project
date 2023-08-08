// External modules
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const multer = require("multer");
const mongoose = require("mongoose");
const { Storage } = require('@google-cloud/storage');
require("dotenv").config(); // Load environment variables from .env file

const storage = new Storage({
  projectId: 'coworker-v-0-0-1',
  keyFilename: './coworker-v-0-0-2-6def27e3c56d.json'
});
const bucket = storage.bucket('coworker-v-0-0-2.appspot.com');

// Internal modules
const {
  checkOwner,
  checkCoworker,
  checkLoggedIn,
} = require("./public/owner_login_check");

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Setup multer with memory storage
const multerConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,  // setting a limit of 5MB
  },
});

// Initiate Express app
const app = express();

// Middleware
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

// Import models
const UserModel = require("./models/user");
const PropertyModel = require("./models/property");
const WorkspaceModel = require("./models/workspaces");
const ReviewModel = require("./models/review");

// Import routes
const signupRouter = require("./routes/signup");
const loginRouter = require("./routes/login");
const propertyRouter = require("./routes/property");
const workspaceRouter = require("./routes/workspace");
const reviewRouter = require("./routes/reviews");

// Routes
app.use("/signup", signupRouter);
app.use("/login", loginRouter);
app.use("/properties", propertyRouter);
app.use("/workspace", workspaceRouter);
app.use('/reviews', reviewRouter);

app.post('/upload', multerConfig.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const blob = bucket.file(req.file.originalname);
  const blobStream = blob.createWriteStream({
    resumable: false,
  });

  blobStream.on('error', (err) => {
    res.status(500).send(err);
  });

  blobStream.on('finish', () => {
    res.status(200).send('File uploaded.');
  });

  blobStream.end(req.file.buffer);
});

app.get('/', async (req, res) => {
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
    res.status(500).send("Internal server error I can not open this");
  }
});

app.use(async (req, res, next) => {
  if (!req.session.user && !["/login", "/signup"].includes(req.path)) {
    return res.redirect("/login");
  }
  next();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});




