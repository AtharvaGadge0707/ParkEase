
const mongoose = require('mongoose')
const crypto = require('crypto')

const Booking = require('../models/Booking')
const Payment = require('../models/Payment')

const VALID_METHODS = ['UPI', 'Card', 'Net Banking']
const VALID_OUTCOMES = ['Success', 'Failed']

// Return payment history belonging only to the authenticated customer.
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      user: req.dbUser._id,
    })
      .populate({
        path: 'booking',
        select: 'bookingReference startTime endTime status',
        populate: [
          { path: 'facility', select: 'name city address' },
          { path: 'slot', select: 'slotNumber' },
          { path: 'vehicle', select: 'registrationNumber' },
        ],
      })
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    })
  } catch (error) {
    console.error('Fetching payments failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch payment history.',
    })
  }
}

// Process a simulated payment for an authenticated customer's booking.
const processPayment = async (req, res) => {
  try {
    const { method, simulationOutcome } = req.body

    if (!mongoose.isValidObjectId(req.params.bookingId)) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      })
    }

    if (!VALID_METHODS.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Select a valid payment method.',
      })
    }

    if (!VALID_OUTCOMES.includes(simulationOutcome)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment simulation outcome.',
      })
    }

    const session = await mongoose.startSession()
    let paymentId = null

    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findOne({
          _id: req.params.bookingId,
          user: req.dbUser._id,
        }).session(session)

        if (!booking) {
          const error = new Error('Booking not found.')
          error.status = 404
          throw error
        }

        if (
          !['Pending Payment', 'Confirmed'].includes(booking.status)
        ) {
          const error = new Error(
            'This booking is not eligible for payment.',
          )
          error.status = 409
          throw error
        }

        if (booking.paymentStatus === 'Paid') {
          const error = new Error(
            'This booking has already been paid.',
          )
          error.status = 409
          throw error
        }

        if (booking.paymentStatus === 'Processing') {
          const error = new Error(
            'A payment is already being processed.',
          )
          error.status = 409
          throw error
        }

        // Lock the booking inside the transaction.
        booking.paymentStatus = 'Processing'
        booking.paymentMethod = method
        await booking.save({ session })

        const previousAttempts = await Payment.countDocuments({
          booking: booking._id,
        }).session(session)

        const attemptNumber = previousAttempts + 1

        const paymentReference =
          `PAY-${crypto.randomBytes(5).toString('hex').toUpperCase()}`

        const paid = simulationOutcome === 'Success'

        const [payment] = await Payment.create(
          [
            {
              paymentReference,
              booking: booking._id,
              user: req.dbUser._id,
              attemptNumber,
              amount: booking.totalAmount,
              currency: booking.currency || 'INR',
              method,
              status: paid ? 'Success' : 'Failed',
              simulationMode: true,
              failureReason: paid
                ? ''
                : 'Payment failed in the demo simulator.',
              paidAt: paid ? new Date() : null,
            },
          ],
          { session },
        )

        // Finalize booking according to the simulated outcome.
        booking.paymentStatus = paid ? 'Paid' : 'Failed'
        booking.status = paid ? 'Confirmed' : 'Cancelled'

        if (!paid) {
          booking.cancelledAt = new Date()
        }

        await booking.save({ session })

        paymentId = payment._id
      })
    } finally {
      await session.endSession()
    }

    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'booking',
        select: 'bookingReference totalAmount currency status',
        populate: [
          { path: 'facility', select: 'name city' },
          { path: 'slot', select: 'slotNumber' },
          { path: 'vehicle', select: 'registrationNumber' },
        ],
      })

    return res.status(200).json({
      success: true,
      message:
        payment.status === 'Success'
          ? 'Payment completed successfully.'
          : 'Payment failed. The booking has been cancelled and the slot released.',
      payment,
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      })
    }

    console.error('Processing payment failed:', error.message)

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Payment attempt conflict. Please retry.',
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to process payment.',
    })
  }
}

module.exports = {
  getMyPayments,
  processPayment,
}
