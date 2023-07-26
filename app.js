const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));


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
  }
}

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = { 
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
      role: req.body.role,
      password: hashedPassword 
    };

    // Regex for email validation
    let emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Password must be at least 8 characters
    if(user.password.length < 8) {
      return res.render('signup', { error: 'Password must be at least 8 characters long.' });
    }

    // Name must be at least 3 characters and only contain alphabet characters
    if(user.name.length < 3 || !(/^[A-Za-z]+$/.test(user.name))) {
      return res.render('signup', { error: 'Name must be at least 3 characters long and only contain alphabet characters.' });
    }

    // Phone number must be at least 8 digits
    if(user.phoneNumber.length < 8 || isNaN(user.phoneNumber)) {
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
    return res.render('login', { error: 'This Username or Email doesnot exist' });
  }

  try {
    if(await bcrypt.compare(req.body.password, user.password)) {
      res.redirect('/');
    } else {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;

      if(loginAttempts[email] > 2) {
        // Wait for 10 seconds before next login attempt
        setTimeout(() => {
          loginAttempts[email] = 0;
        }, 10000);

        res.render('login', { error: 'Too many login attempts. Please try again in 10 seconds.', timeout: 10 });
      } else {
        res.render('login', { error: 'Incorrect password. Please try again. Permitted attmpt: '+ (3-loginAttempts[email])});
      }
    }
  } catch {
    res.status(500).send();
  }
});



app.listen(3000, () => console.log('Server started on port 3000'));
