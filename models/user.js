const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    id: String,
    name: String,
    phone: { type: Number, min: 1 },
    email: String,
    role: { type: String, enum: ["Owner", "Coworker"] },
    password: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
