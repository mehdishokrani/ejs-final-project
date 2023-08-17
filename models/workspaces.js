// Import the necessary libraries
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // Import the UUID library to generate unique identifiers
const Schema = mongoose.Schema; // Create a shorthand for the mongoose Schema constructor

// Define the schema for the 'Workspace' collection in the database
const WorkspaceSchema = new Schema(
  {
    // Unique identifier for the workspace, using UUID for uniqueness across platforms
    _id: { type: String, default: () => uuidv4() },

    // Reference to the property this workspace belongs to
    propertyId: String,

    // Type or category of the workspace (e.g., "open", "private", etc.)
    type: String,

    // Number of seats available in the workspace
    seats: { type: Number, min: 1 },

    // Smoking policy of the workspace (could be "yes", "no", etc.)
    smoking: String,

    // Availability date for the workspace
    availability: Date,

    // Lease type or duration for the workspace (e.g., "monthly", "yearly")
    lease: String,

    // Price for the workspace, with a minimum value constraint
    price: { type: Number, min: 1 },

    // Indicates if the workspace has an air conditioner ("true", "false", or other representation)
    hasAirConditioner: String,

    // Printer availability in the workspace (e.g., "available", "not available")
    printer: String,

    // Landline availability in the workspace
    landline: String,

    // Indicates if the workspace location has an onsite gym
    hasOnsiteGym: String,

    // Parking facilities or policies for the workspace
    parking: String,

    // URL of the image representing the workspace
    imageUrl: String,

    // References to reviews made for this workspace
    reviews: [{ type: String, ref: "Review" }],
  },
  // Add timestamps (createdAt and updatedAt) to each workspace document
  { timestamps: true }
);

// Export the Workspace model to be used in other parts of the application
module.exports = mongoose.model('Workspace', WorkspaceSchema);
