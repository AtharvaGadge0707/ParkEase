const mongoose = require('mongoose')

const vehicleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 4,
      maxlength: 15,
      match: /^[A-Z0-9 -]{4,15}$/,
    },
    type: {
      type: String,
      required: true,
      enum: ['Car', 'Motorcycle', 'SUV', 'Van', 'Other'],
    },
    make: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    model: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    color: {
      type: String,
      trim: true,
      maxlength: 25,
      default: '',
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

vehicleSchema.index(
  { user: 1, registrationNumber: 1 },
  { unique: true },
)

module.exports = mongoose.model('Vehicle', vehicleSchema)