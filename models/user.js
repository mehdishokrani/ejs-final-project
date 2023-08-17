// Import the mongoose library to interact with MongoDB
const mongoose = require('mongoose');

// Create a shorthand for the mongoose Schema constructor
const Schema = mongoose.Schema;

// Define the schema for the 'User' collection in the database
const UserSchema = new Schema(
  {
    // Unique identifier for the user
    id: String,

    // Full name of the user
    name: String,

    // Contact phone number of the user; assuming it's stored as a numeric value with a minimum value constraint
    phone: { type: Number, min: 1 },

    // Email address of the user
    email: String,

    // Role that the user assumes, can only be 'Owner' or 'Coworker'
    role: { type: String, enum: ["Owner", "Coworker"] },

    // Hashed password for the user (Note: Always hash passwords before storing in a database for security purposes)
    password: String,
  },
  // Add timestamps (createdAt and updatedAt) to each user document
  { timestamps: true }
);

// Export the User model to be utilized in other parts of the application
module.exports = mongoose.model('User', UserSchema);
