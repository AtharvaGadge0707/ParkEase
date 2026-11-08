
const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    method: {
      type: String,
      enum: ['UPI', 'Card', 'Net Banking'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Success', 'Failed'],
      required: true,
    },
    simulationMode: {
      type: Boolean,
      default: true,
    },
    failureReason: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

paymentSchema.index(
  { booking: 1, attemptNumber: 1 },
  { unique: true },
)

paymentSchema.index({
  user: 1,
  createdAt: -1,
})

module.exports = mongoose.model('Payment', paymentSchema)
