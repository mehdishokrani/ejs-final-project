const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

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

app.post('/properties/new', checkOwner, (req, res) => {
  let id = Date.now().toString();
  req.session.user.properties[id] = {
    address: req.body.address,
    neighborhood: req.body.neighborhood,
    sqft: req.body.sqft,
    parking: req.body.parking === 'yes',
    publicTrans: req.body.publicTrans === 'yes',
    workspaces: {},
  };
  res.redirect('/properties');
});

app.get('/properties/:id', checkOwner, (req, res) => {
  const property = req.session.user.properties[req.params.id];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  res.render('property', { property });
});

app.get('/properties/:propertyId/workspaces/new', (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  res.render('workspace-new', { propertyId: req.params.propertyId });
});

app.post('/properties/:propertyId/workspaces/new', (req, res) => {
  const property = req.session.user.properties[req.params.propertyId];
  if (!property) {
    return res.status(404).send('Property not found');
  }
  const id = Date.now().toString();
  property.workspaces[id] = {
    type: req.body.type,
    seats: req.body.seats,
    smoking: req.body.smoking === 'yes',
    availability: req.body.availability,
    lease: req.body.lease,
    price: req.body.price,
  };
  res.redirect('/properties/' + req.params.propertyId);
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

app.post('/properties/:propertyId/edit', checkOwner, (req, res) => {
  const propertyId = req.params.propertyId;
  const properties = req.session.user.properties;

  if (!properties[propertyId]) {
    return res.status(404).send('Property not found');
  }

  properties[propertyId] = {
    ...properties[propertyId],
    address: req.body.address,
    neighborhood: req.body.neighborhood,
    sqft: req.body.sqft,
    parking: req.body.parking === 'yes',
    publicTrans: req.body.publicTrans === 'yes',
  };

  res.redirect('/properties');
});

app.post('/properties/:propertyId/delete', checkOwner, (req, res) => {
  delete req.session.user.properties[req.params.propertyId];
  res.redirect('/properties');
});


app.listen(3000, () => {
  console.log('Server started on port 3000');
});


