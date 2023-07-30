const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const multer = require('multer');
const flatted = require('flatted');


const fs = require('fs');
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

class User {
  constructor(name, phone, email, role, password) {
    this.name = name;
    this.phone = phone;
    this.email = email;
    this.role = role;
    this.password = password;
    this.properties = {};
  }
}

class Property {
  constructor(address1, address2, city, state, postalcode, neighborhood, sqft, parking, publicTrans, imageUrl = "") {
    this.address1 = address1;
    this.address2 = address2;
    this.city = city;
    this.state = state;
    this.postalcode = postalcode;
    this.neighborhood = neighborhood;
    this.sqft = sqft;
    this.parking = parking;
    this.publicTrans = publicTrans;
    this.imageUrl = imageUrl;
    this.workspaces = {};
    this.reviews = [];
  }
}


class Workspace {
  constructor(type, seats, smoking, availability, lease, price, hasAirConditioner, printer, landline, hasOnsiteGym, parking, imageUrl = "") {
    this.type = type;
    this.seats = seats;
    this.smoking = smoking;
    this.availability = availability; // New property for availability date
    this.lease = lease; // New property for lease term
    this.price = price;
    this.hasAirConditioner = hasAirConditioner;
    this.printer = printer;
    this.landline = landline;
    this.hasOnsiteGym = hasOnsiteGym;
    this.parking = parking;
    this.imageUrl = imageUrl;
    this.reviews = [];
  }
}


app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User(
      req.body.name,
      req.body.phoneNumber,
      req.body.email,
      req.body.role,
      hashedPassword
    );

    // Regex for email validation
    let emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Password must be at least 8 characters
    if(user.password.length < 3) {
      return res.render('signup', { error: 'Password must be at least 8 characters long.' });
    }

    // Name must be at least 3 characters and only contain alphabet characters
    if(user.name.length < 3 || !(/^[A-Za-z\s]+$/.test(user.name))) {
      return res.render('signup', { error: 'Name must be at least 3 characters long and only contain alphabet characters or spaces.' });
    }

    // Phone number must be at least 8 digits
    if(user.phone.length < 8 || isNaN(user.phone)) {
      return res.render('signup', { error: 'Phone number must be at least 8 digits.' });
    }

    // Email must end with a valid domain extension
    if(!emailRegex.test(user.email)) {
      return res.render('signup', { error: 'Email must be valid and end with a valid domain extension.' });
    }

    users.push(user);
    res.redirect('/login');
  } catch {
    res.redirect('/signup');
  }
});


app.get('/login', (req, res) => {
  res.render('login');
});

let loginAttempts = {};

app.post('/login', async (req, res) => {
  const email = req.body.email;
  const user = users.find(user => user.email === email);

  if (user == null) {
    return res.render('login', { error: 'This Username or Email does not exist' });
  }

  try {
    if(await bcrypt.compare(req.body.password, user.password)) {
      req.session.user = user;
      if(user.role === 'Owner') {
        res.redirect('/properties');
      } else {
        res.redirect('/');
      }
    } else {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;

      if(loginAttempts[email] > 2) {
        // Wait for 10 seconds before next login attempt
        setTimeout(() => {
          loginAttempts[email] = 0;
        }, 10000);

        res.render('login', { error: 'Too many login attempts. Please try again in 10 seconds.', timeout: 10 });
      } else {
        res.render('login', { error: 'Incorrect password. Please try again. Permitted attempt: '+ (3-loginAttempts[email])});
      }
    }
  } catch {
    res.status(500).send();
  }
});

function checkOwner(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'Owner') {
    return res.status(403).send('Unauthorized');
  }
  next();
}

app.get('/properties', checkOwner, (req, res) => {
  res.render('properties', { properties: req.session.user.properties });
});

app.get('/properties/new', checkOwner, (req, res) => {
  res.render('property-new');
});

app.post('/properties/new', upload.single('image'), checkOwner, (req, res) => {
  let id = Date.now().toString();

  let imageUrl = '';
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }
  const property = new Property(
    req.body.address1,
    req.body.address2,
    req.body.city,
    req.body.state,
    req.body.postalcode,
    req.body.neighborhood,
    req.body.sqft,
    req.body.parking === 'yes',
    req.body.publicTrans === 'yes',
    imageUrl
  );
  
  req.session.user.properties[id] = property;
  res.redirect('/properties');
});



app.get('/properties/:id', checkOwner, (req, res) => {
  const property = req.session.user.properties[req.params.id];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  res.render('property', { property });
});


app.get('/properties/:propertyId/workspaces', checkOwner, (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  res.render('workspaces', { propertyId: req.params.propertyId, workspaces: property.workspaces });//Here**********
});



app.get('/properties/:propertyId/workspaces/new', checkOwner, (req, res) => {
  const propertyId = req.params.propertyId;
  res.render('workspace-new', { propertyId });
});

app.post('/properties/:propertyId/workspaces/new', upload.single('image'), checkOwner, (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }

  // Create a new workspace
  let imageUrl = '';
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename; // this assumes the file is saved in 'uploads' directory in your project
  }
  const workspace = new Workspace(
    req.body.type,
    req.body.seats,
    req.body.smoking === 'yes',
    req.body.availability, // Get availability date from the form data
    req.body.lease, // Get lease term from the form data
    req.body.price,
    req.body.hasAirConditioner === 'yes',
    req.body.printer,
    req.body.landline,
    req.body.hasOnsiteGym === 'yes',
    req.body.parking,
    imageUrl
  );

  // Generate a unique ID for the workspace
  const id = crypto.randomBytes(16).toString('hex');

  // Add the new workspace to the property
  property.workspaces[id] = workspace;
  console.log(workspace)
  console.log("Propert of add new")

  // Redirect to the workspaces page for this property
  res.redirect('/properties/' + req.params.propertyId + '/workspaces');
});

app.get('/properties/:propertyId/workspaces/:workspaceId', (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  const workspace = property.workspaces[req.params.workspaceId];
  if (!workspace) {
    return res.status(404).send('Workspace not found');
  }
  res.render('workspace', { workspace });
});

app.get('/properties/:propertyId/edit', checkOwner, (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  res.render('property-edit', { propertyId: req.params.propertyId, property: property });
});

app.post('/properties/:propertyId/edit', upload.single('image'), checkOwner, (req, res) => {
  const propertyId = req.params.propertyId;
  const properties = req.session.user.properties;

  if (!properties[propertyId]) {
    return res.status(404).send('Property not found');
  }

  if (req.file) {
    const imagePath = path.join(__dirname, 'public', properties[propertyId].imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    properties[propertyId].imageUrl = '/uploads/' + req.file.filename;
  }

  properties[propertyId] = {
    ...properties[propertyId],
    address1: req.body.address1,
    address2: req.body.address2,
    city: req.body.city,
    state: req.body.state,
    postalcode: req.body.postalcode,
    neighborhood: req.body.neighborhood,
    sqft: req.body.sqft,
    parking: req.body.parking === 'yes',
    publicTrans: req.body.publicTrans === 'yes',
  };

  res.redirect('/properties');
});

app.post('/properties/:propertyId/delete', checkOwner, (req, res) => {
  const propertyId = req.params.propertyId;
  const properties = req.session.user.properties;

  if (!properties[propertyId]) {
    return res.status(404).send('Property not found');
  }

  // If an image exists for this property
  if (properties[propertyId].imageUrl) {
    // Delete the existing image
    try {
      fs.unlinkSync(path.join(__dirname, 'public', properties[propertyId].imageUrl));
    } catch (err) {
      console.error(err);
      // You can handle the error here. For instance, you may choose to
      // send a response with an error message.
    }
  }

  // Remove the property from the list
  delete properties[propertyId];

  res.redirect('/properties');
});



app.get('/owner/workspaces', checkOwner, (req, res) => {
  let workspacesList = [];
  for (let propertyId in req.session.user.properties) {
    let property = req.session.user.properties[propertyId];
    for (let workspaceId in property.workspaces) {
      let workspace = property.workspaces[workspaceId];
      workspace.propertyId = propertyId; // You might want to know the propertyId for each workspace
      workspace.workspaceId = workspaceId; // Set workspaceId

      // Construct address string
      let address = property.address1;
      if(property.address2) address += ', ' + property.address2;
      address += ', ' + property.city;
      address += ', ' + property.state;
      address += ', ' + property.postalcode;

      workspace.propertyAddress = address; // Set propertyAddress

      workspacesList.push(workspace);
    }
  }
  res.render('workspaces-all-owner', {workspaces: workspacesList});
});




app.get('/properties/:propertyId/workspaces/:workspaceId/edit', checkOwner, (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  const workspace = property.workspaces[req.params.workspaceId];
  if (!workspace) {
    return res.status(404).send('Workspace not found');
  }

// Create default values for each field based on the workspace data
const defaultType = workspace.type;
const defaultSeats = workspace.seats;
const defaultSmoking = workspace.smoking ? 'yes' : 'no';
const defaultAvailability = workspace.availability;
const defaultLease = workspace.lease;
const defaultPrice = workspace.price;
const defaultHasAirConditioner = workspace.hasAirConditioner ? 'yes' : 'no';
const defaultPrinter = workspace.printer;
const defaultLandline = workspace.landline;
const defaultHasOnsiteGym = workspace.hasOnsiteGym ? 'yes' : 'no';
const defaultParking = workspace.parking;

  res.render('workspace-edit', { propertyId: req.params.propertyId, workspaceId: req.params.workspaceId, workspace: workspace,
    defaultType: defaultType,
    defaultSeats: defaultSeats,
    defaultSmoking: defaultSmoking,
    defaultAvailability: defaultAvailability,
    defaultLease: defaultLease,
    defaultPrice: defaultPrice,
    defaultHasAirConditioner: defaultHasAirConditioner,
    defaultPrinter: defaultPrinter,
    defaultLandline: defaultLandline,
    defaultHasOnsiteGym: defaultHasOnsiteGym,
    defaultParking: defaultParking
  
  });
});

app.post('/properties/:propertyId/workspaces/:workspaceId/edit', upload.single('image'), checkOwner, (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  let workspace = property.workspaces[req.params.workspaceId];
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

  res.redirect('/properties/' + req.params.propertyId + '/workspaces');
});

app.post('/properties/:propertyId/workspaces/:workspaceId/delete', checkOwner, (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  let workspace = property.workspaces[req.params.workspaceId];
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

  delete property.workspaces[req.params.workspaceId];
  res.redirect('/properties/' + req.params.propertyId + '/workspaces');
});



app.use((req, res, next) => {
  if (!req.session.user && ['/login', '/signup'].indexOf(req.url) === -1) {
    return res.redirect('/login');
  }
  next();
});

app.listen(3000, () => {
  console.log('Server started on port 3000, please enter localhost3000/signup in URL');
});



