// External modules
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");

// Internal modules
const {
  checkOwner,
  checkCoworker,
  checkLoggedIn,
} = require("./public/owner_login_check");

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/Coworker-v-1")
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

// Create uploads directory if it doesn't exist
const uploadDirectory = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

// Setup multer
const upload = multer({ dest: "uploads/" });

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
      maxAge: 1000 * 60 * 60, // 1 hour session
    },
  })
);
app.set("view engine", "ejs");
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import models
const UserModel = require("./models/user");
const PropertyModel = require("./models/property")
const WorkspaceModel = require("./models/workspaces")
const ReviewModel = require("./models/review")

// Import routes
const homeRouter = require('./routes/home');
const signupRouter = require("./routes/signup");
const loginRouter = require("./routes/login");
const propertyRouter = require("./routes/property");
const workspaceRouter = require("./routes/workspace");
const reviewRouter = require("./routes/reviews");

// Routes
app.use('/', homeRouter);
app.use("/signup", signupRouter);
app.use("/login", loginRouter);
app.use("/properties", propertyRouter);
app.use("/workspace", workspaceRouter);
app.use('/reviews', reviewRouter);



app.use(async (req, res, next) => {
  if (!req.session.user && !["/login", "/signup"].includes(req.path)) {
    return res.redirect("/login");
  }
  next();
});



// Start the server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
