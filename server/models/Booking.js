
const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startTime
        },
        message: 'Booking end time must be after start time.',
      },
    },
    durationHours: {
      type: Number,
      required: true,
      min: 1,
      max: 168,
    },
    rateType: {
      type: String,
      enum: ['Hourly', 'Daily'],
      required: true,
    },
    rateValue: {
      type: Number,
      required: true,
      min: 0,
    },
    billableUnits: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: [
        'Pending Payment',
        'Confirmed',
        'Cancelled',
        'Completed',
      ],
      default: 'Pending Payment',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Paid', 'Failed'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Card', 'Net Banking', null],
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
        entryTime: {
      type: Date,
      default: null,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)

bookingSchema.index({
  slot: 1,
  status: 1,
  startTime: 1,
  endTime: 1,
})

bookingSchema.index({
  user: 1,
  createdAt: -1,
})

module.exports = mongoose.model('Booking', bookingSchema)
