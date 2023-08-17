// Import the mongoose library to interact with MongoDB
const mongoose = require('mongoose');

// Import the v4 version of the 'uuid' library to generate unique identifiers
const { v4: uuidv4 } = require('uuid');

// Define the schema for the 'Property' collection in the database
const PropertySchema = new mongoose.Schema(
  {
    // Use a UUID as the primary identifier for each document instead of the default ObjectID
    _id: { type: String, default: () => uuidv4() },
    
    // Reference to the user who owns this property
    ownerId: { type: String, ref: "User" },
    
    // Various fields representing the address and details of the property
    address1: String,
    address2: String,
    city: String,
    state: String,
    postalcode: String,
    neighborhood: String,
    
    // Size of the property in square feet, with a minimum value of 1
    sqft: { type: Number, min: 1 },
    
    // Other details of the property
    parking: String,
    publicTrans: String,
    imageUrl: String,

    // An array to hold related workspaces for this property
    workspaces: Array,
  },
  // Add timestamps (createdAt and updatedAt) to each document
  { timestamps: true }
);

// Export the model to be used in other parts of the application
module.exports = mongoose.model('Property', PropertySchema);
