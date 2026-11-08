
const mongoose = require('mongoose')

const slotSchema = new mongoose.Schema(
  {
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
    },
    slotNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 20,
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ['Car', 'Motorcycle', 'SUV', 'Van', 'Other'],
    },
    floor: {
      type: String,
      trim: true,
      default: 'Ground Floor',
      maxlength: 30,
    },
    section: {
      type: String,
      trim: true,
      default: '',
      maxlength: 30,
    },
    status: {
      type: String,
      enum: ['Available', 'Reserved', 'Occupied', 'Unavailable'],
      default: 'Available',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reservationVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  { timestamps: true },
)

slotSchema.index(
  { facility: 1, slotNumber: 1 },
  { unique: true },
)

module.exports = mongoose.model('Slot', slotSchema)
