// Import the mongoose library to interact with MongoDB
const mongoose = require('mongoose');

// Import the v4 version of the 'uuid' library for generating unique identifiers
const { v4: uuidv4 } = require('uuid');

// Create a shorthand for the mongoose Schema constructor
const Schema = mongoose.Schema;

// Define the schema for the 'Review' collection in the database
const ReviewSchema = new Schema(
    {
      // Use a UUID as the primary identifier for each document in lieu of the default ObjectID
      _id: { type: String, default: () => uuidv4() },
      
      // Identifier of the workspace that this review pertains to
      workspaceId: String,
      
      // Reference to the user (coworker) who wrote this review
      coworkerId: { type: String, ref: "User" },
      
      // Rating for the workspace, with a scale from 1 to 5
      rating: { type: Number, min: 1, max: 5 },
      
      // Review comment or feedback
      comment: String,
    },
    // Add timestamps (createdAt and updatedAt) to each review document
    { timestamps: true }
  );

// Export the Review model to be utilized in other parts of the application
module.exports = mongoose.model('Review', ReviewSchema);
