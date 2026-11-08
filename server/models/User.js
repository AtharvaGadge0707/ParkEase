const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20,
    },
    role: {
      type: String,
      enum: ['Customer', 'Parking Staff', 'Administrator'],
      default: 'Customer',
    },
    assignedFacility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      default: null,
    },
  },
  { timestamps: true },
)

const User = mongoose.model('User', userSchema)

module.exports = User