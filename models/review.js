const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema(
    {
      _id: { type: String, default: () => uuidv4() },
      workspaceId: String,
      coworkerId: { type: String, ref: "User" },
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
    },
    { timestamps: true }
  );
  

// Export the model
module.exports = mongoose.model('Review', ReviewSchema);
