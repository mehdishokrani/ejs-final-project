const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const WorkspaceSchema = new Schema(
  {
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
    reviews: [{ type: String, ref: "Review" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workspace', WorkspaceSchema);
