const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/Coworker-v-1')
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));


const Schema = mongoose.Schema;
const uploadDirectory = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const upload = multer({ dest: 'uploads/' });
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

app.set('view engine', 'ejs');
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
let users = [];

// Define your models here
const UserSchema = new Schema({
  id: String,
  name: String,
  phone: { type: Number, min: 1 },
  email: String,
  role: { type: String, enum: ['Owner', 'Coworker'] },
  password: String,
}, { timestamps: true });

const PropertySchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  ownerId: String,
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
}, { timestamps: true });

const WorkspaceSchema = new Schema({
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
}, { timestamps: true });



const UserModel = mongoose.model('User', UserSchema);
const PropertyModel = mongoose.model('Property', PropertySchema);
const WorkspaceModel = mongoose.model('Workspace', WorkspaceSchema);


app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
  try {
    // Get the form input
    const { name, phoneNumber, email, role, password } = req.body;
  
    // Validate input
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const nameRegex = /^[A-Za-z\s]+$/;

    if (password.length < 8) {
      return res.render('signup', { error: 'Password must be at least 8 characters long.' });
    }
    
    if (name.length < 3 || !nameRegex.test(name)) {
      return res.render('signup', { error: 'Name must be at least 3 characters long and only contain alphabet characters or spaces.' });
    }

    if (phoneNumber.length < 8 || isNaN(phoneNumber)) {
      return res.render('signup', { error: 'Phone number must be at least 8 digits.' });
    }

    if (!emailRegex.test(email)) {
      return res.render('signup', { error: 'Email must be valid and end with a valid domain extension.' });
    }
    
    // Check if role is either 'Owner' or 'Coworker'
    if (!['Owner', 'Coworker'].includes(role)) {
      return res.render('signup', { error: 'Role must be either "Owner" or "Coworker"' });
    }
    
    // Check if email already exists in the database
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.render('signup', { error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new UserModel({ name, phone: phoneNumber, email, role, password: hashedPassword });

    // Save user to the database
    await user.save();

    // Redirect to login page
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.redirect('/signup');
  }
});



app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

let loginAttempts = {};

app.post('/login', async (req, res) => {
  const email = req.body.email;

  // Fetch user from database
  const user = await UserModel.findOne({ email });

  if (user == null) {
    return res.render('login', { error: 'This Username or Email does not exist' });
  }

  try {
    if(await bcrypt.compare(req.body.password, user.password)) {
      req.session.user = user;
      if(user.role === 'Owner') {
        res.redirect('/properties');
      } else {
        res.redirect('/allworkspaces');
      }
    } else {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;

      if(loginAttempts[email] > 2) {
        setTimeout(() => {
          loginAttempts[email] = 0;
        }, 1000 * 60 * 60);

        return res.render('login', { error: 'Too many attempts. Please try again later.' });
      } else {
        return res.render('login', { error: 'Incorrect password.' });
      }
    }
  } catch {
    res.render('login', { error: 'Something went wrong. Please try again later.' });
  }
});



function checkOwner(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'Owner') {
    return res.status(403).redirect('/login');
  }
  next();
}

function checkLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}


app.get('/properties', checkLoggedIn, checkOwner, async (req, res) => {
  try {
    const properties = await PropertyModel.find({ ownerId: req.session.user.id }).exec();
    const propertiesWithWorkspaces = await Promise.all(properties.map(async property => {
      const workspaces = await WorkspaceModel.find({ propertyId: property._id }).exec();
      // Attach the workspaces to the property
      property.workspaces = workspaces;
      return property;
    }));
    res.render('properties', { properties: propertiesWithWorkspaces });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


app.get('/properties/new', checkLoggedIn, checkOwner, (req, res) => {
  res.render('property-new');
});

app.post('/properties/new', checkLoggedIn, checkOwner, upload.single('image'), async (req, res) => {
  let imageUrl = "";

  if(req.file) {
    imageUrl = path.join('uploads', req.file.filename);
  }

  try {
    const property = new PropertyModel({
      ownerId: req.session.user.id,
      address1: req.body.address1,
      address2: req.body.address2,
      city: req.body.city,
      state: req.body.state,
      postalcode: req.body.postalcode,
      neighborhood: req.body.neighborhood,
      sqft: req.body.sqft,
      parking: req.body.parking,
      publicTrans: req.body.publicTrans,
      imageUrl: imageUrl
    });

    await property.save();
    res.redirect('/properties');
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/properties/:propertyId/edit', checkLoggedIn, checkOwner, async (req, res) => {
  try {
    const property = await PropertyModel.findOne({ _id: req.params.propertyId, ownerId: req.session.user.id }).exec();

    if (property == null) {
      return res.status(404).send('Property not found');
    }

    res.render('property-edit', { property: property });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});




app.post('/properties/:propertyId/edit', checkLoggedIn, checkOwner, upload.single('image'), async (req, res) => {
  try {
    const property = await PropertyModel.findOne({ _id: req.params.propertyId, ownerId: req.session.user.id }).exec();

    if (property == null) {
      return res.status(404).send('Property not found');
    }

    if (req.file) {
      property.imageUrl = path.join('uploads', req.file.filename);
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
    res.redirect('/properties');
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post('/properties/:propertyId/delete', async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    console.log("Delete property with ID:", propertyId);
    const ans = await PropertyModel.deleteOne({_id: propertyId});
    console.log("Delete result:", ans);
    if(ans.deletedCount > 0) {
      console.log("Property deleted successfully");
      res.redirect('/properties');
    } else {
      console.log("Property not found, nothing deleted");
      res.status(404).send('Property not found');
    }
  } catch (err) {
    console.log("Error during deletion:", err);
    res.status(500).send('Internal server error');
  }
});




app.get('/properties/:propertyId/workspaces', checkOwner, async (req, res) => {
  try {
    // ... existing code ...
    const workspaces = await WorkspaceModel.find({ propertyId: req.params.propertyId }).exec();
    
    if (!Array.isArray(workspaces)) {
      console.log('Workspaces is not an array. Instead, it is a(n)', typeof workspaces);
    } else {
      console.log('Number of workspaces:', workspaces.length);
    }

    res.render('workspaces', { propertyId: req.params.propertyId, workspaces: workspaces });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal server error');
  }
});



app.get('/properties/:propertyId/workspaces/new', checkOwner, (req, res) => {
  const propertyId = req.params.propertyId;
  res.render('workspace-new', { propertyId });
});

app.post('/properties/:propertyId/workspaces/new', upload.single('image'), checkOwner, async (req, res) => {
  let imageUrl = '';
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename; 
  }
  try {
    const workspace = new WorkspaceModel({
      propertyId: req.params.propertyId,
      type: req.body.type,
      seats: req.body.seats,
      smoking: req.body.smoking === 'yes',
      availability: req.body.availability,
      lease: req.body.lease,
      price: req.body.price,
      hasAirConditioner: req.body.hasAirConditioner === 'yes',
      printer: req.body.printer,
      landline: req.body.landline,
      hasOnsiteGym: req.body.hasOnsiteGym === 'yes',
      parking: req.body.parking,
      imageUrl: imageUrl
    });

    await workspace.save();
    res.redirect('/properties/' + req.params.propertyId + '/workspaces');
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal server error');
  }
});

// app.get('/properties/:propertyId/workspaces/:workspaceId', async (req, res) => {
//   try {
//     const workspace = await WorkspaceModel.findOne({ _id: req.params.workspaceId, propertyId: req.params.propertyId }).exec();
//     if (!workspace) {
//       return res.status(404).send('Workspace not found');
//     }
//     res.render('workspaces', { workspace });
//   } catch (err) {
//     console.log(err);
//     res.status(500).send('Internal server error');
//   }
// });


app.get('/properties/:propertyId/workspaces/:workspaceId/edit', checkOwner, async (req, res) => {
  try {
    const property = await PropertyModel.findOne({ _id: req.params.propertyId, ownerId: req.session.user.id });
    
    if (!property) {
      return res.status(404).send('Property not found');
    }

    const workspace = await WorkspaceModel.findOne({ _id: req.params.workspaceId, propertyId: req.params.propertyId });

    if (!workspace) {
      return res.status(404).send('Workspace not found');
    }

    const workspaceObj = workspace.toObject();

    workspaceObj.defaultType = workspaceObj.type;
    workspaceObj.defaultSeats = workspaceObj.seats;
    workspaceObj.defaultSmoking = workspaceObj.smoking === 'yes' ? 'yes' : 'no';
    workspaceObj.defaultAvailability = workspaceObj.availability;
    workspaceObj.defaultLease = workspaceObj.lease;
    workspaceObj.defaultPrice = workspaceObj.price;
    workspaceObj.defaultHasAirConditioner = workspaceObj.hasAirConditioner === 'yes' ? 'yes' : 'no'
    workspaceObj.defaultPrinter = workspaceObj.printer;
    workspaceObj.defaultLandline = workspaceObj.landline;
    workspaceObj.defaultHasOnsiteGym = workspaceObj.hasOnsiteGym === 'yes' ? 'yes' : 'no';
    workspaceObj.defaultParking = workspaceObj.parking;

    res.render('workspace-edit', {
      propertyId: req.params.propertyId,
      workspaceId: req.params.workspaceId,
      ...workspaceObj
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


app.post('/properties/:propertyId/workspaces/:workspaceId/edit', upload.single('image'), checkOwner, async (req, res) => {
  try {
    const property = await PropertyModel.findOne({ _id: req.params.propertyId, ownerId: req.session.user.id });

    if (!property) {
      return res.status(404).send('Property not found');
    }

    const workspace = await WorkspaceModel.findOne({ _id: req.params.workspaceId, propertyId: req.params.propertyId });

    if (!workspace) {
      return res.status(404).send('Workspace not found');
    }

    workspace.type = req.body.type;
    workspace.seats = req.body.seats;
    workspace.smoking = req.body.smoking === 'yes';
    workspace.availability = req.body.availability;
    workspace.lease = req.body.lease;
    workspace.price = req.body.price;
    workspace.hasAirConditioner = req.body.hasAirConditioner === 'yes';
    workspace.printer = req.body.printer;
    workspace.landline = req.body.landline;
    workspace.hasOnsiteGym = req.body.hasOnsiteGym === 'yes';
    workspace.parking = req.body.parking;

    if (req.file) {
      const imagePath = path.join(uploadDirectory, workspace.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      workspace.imageUrl = req.file.filename;
    }

    await workspace.save();

    res.redirect(`/properties/${req.params.propertyId}/workspaces`);

  } catch (err) {
    console.log(err);
    res.status(500).send('Internal server error');
  }
});


app.get('/owner/workspaces', checkOwner, async (req, res) => {
  try {
    const properties = await PropertyModel.find({ ownerId: req.session.user.id }).exec();
    let workspacesList = [];

    for (let property of properties) {
      const workspaces = await WorkspaceModel.find({ propertyId: property._id }).exec();
      for (let workspace of workspaces) {
        workspace = workspace.toObject(); // Convert document to a plain javascript object
        workspace.propertyId = property._id;
        
        let address = property.address1;
        if(property.address2) address += ', ' + property.address2;
        address += ', ' + property.city;
        address += ', ' + property.state;
        address += ', ' + property.postalcode;
        
        workspace.propertyAddress = address;

        workspacesList.push(workspace);
      }
    }

    res.render('workspaces-all-owner', {workspaces: workspacesList});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal server error');
  }
});


app.post('/properties/:propertyId/workspaces/:workspaceId/delete', checkOwner, async (req, res) => {
  try {
    const property = await PropertyModel.findOne({ _id: req.params.propertyId, ownerId: req.session.user.id });
    
    if (!property) {
      return res.status(404).send('Property not found');
    }

    const workspace = await WorkspaceModel.findOne({ _id: req.params.workspaceId, propertyId: req.params.propertyId });
    
    if (!workspace) {
      return res.status(404).send('Workspace not found');
    }

    if (workspace.imageUrl) {
      try {
        fs.unlinkSync(path.join(uploadDirectory, workspace.imageUrl));
      } catch (err) {
        console.error(err);
      }
    }

    await workspace.remove();
    
    res.redirect('/properties/' + req.params.propertyId + '/workspaces');
    
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal server error');
  }
});

app.use(async (req, res, next) => {
  if (!req.session.user && !['/login', '/signup'].includes(req.path)) {
    return res.redirect('/login');
  }
  next();
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});

