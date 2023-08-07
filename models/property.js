const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PropertySchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    ownerId: { type: String, ref: "User" },
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
  },
  { timestamps: true }
);

// Export the model
module.exports = mongoose.model('Property', PropertySchema);
