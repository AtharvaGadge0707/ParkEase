
const mongoose = require('mongoose')
const crypto = require('crypto')

const Booking = require('../models/Booking')
const Facility = require('../models/Facility')
const Slot = require('../models/Slot')
const Vehicle = require('../models/Vehicle')

const VALID_VEHICLE_TYPES = [
  'Car',
  'Motorcycle',
  'SUV',
  'Van',
  'Other',
]

const bookingError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

// Validate booking dates and duration.
const validateBookingDates = (startValue, endValue) => {
  const startTime = new Date(startValue)
  const endTime = new Date(endValue)

  if (
    !Number.isFinite(startTime.getTime()) ||
    !Number.isFinite(endTime.getTime())
  ) {
    throw bookingError(400, 'Please provide valid booking dates.')
  }

  if (startTime <= new Date()) {
    throw bookingError(400, 'Booking start time must be in the future.')
  }

  if (endTime <= startTime) {
    throw bookingError(400, 'End time must be after start time.')
  }

  const durationHours =
    (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000)

  if (durationHours < 1 || durationHours > 168) {
    throw bookingError(
      400,
      'Booking duration must be between 1 hour and 7 days.',
    )
  }

  return {
    startTime,
    endTime,
    durationHours,
  }
}

// Calculate charges on the backend using facility rates.
const calculatePricing = (rate, durationHours) => {
  let rateType
  let rateValue
  let billableUnits

  if (durationHours <= 24) {
    rateType = 'Hourly'
    rateValue = rate.hourlyRate
    billableUnits = Math.ceil(durationHours)
  } else {
    rateType = 'Daily'
    rateValue = rate.dailyRate
    billableUnits = Math.ceil(durationHours / 24)
  }

  const totalAmount = Number(
    (rateValue * billableUnits).toFixed(2),
  )

  return {
    rateType,
    rateValue,
    billableUnits,
    totalAmount,
  }
}

// GET: Find available slots for a selected facility and time period.
const getAvailableSlots = async (req, res) => {
  try {
    const {
      facilityId,
      vehicleType,
      startTime: startValue,
      endTime: endValue,
    } = req.query

    if (
      !mongoose.isValidObjectId(facilityId) ||
      !VALID_VEHICLE_TYPES.includes(vehicleType)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid facility and vehicle type are required.',
      })
    }

    const { startTime, endTime, durationHours } =
      validateBookingDates(startValue, endValue)

    const facility = await Facility.findOne({
      _id: facilityId,
      status: 'Active',
    })

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Active parking facility not found.',
      })
    }

    const rate = facility.rates.find(
      (item) => item.vehicleType === vehicleType,
    )

    if (!rate) {
      return res.status(400).json({
        success: false,
        message: 'This vehicle type is not supported by the facility.',
      })
    }

    const slots = await Slot.find({
      facility: facility._id,
      vehicleType,
      status: { $in: ['Available', 'Occupied'] },
    }).sort({ slotNumber: 1 })

    const slotIds = slots.map((slot) => slot._id)

    const conflictingBookings = await Booking.find({
      slot: { $in: slotIds },
      status: { $in: ['Pending Payment', 'Confirmed'] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    }).distinct('slot')

    const bookedSlotIds = new Set(
      conflictingBookings.map((id) => id.toString()),
    )

    const availableSlots = slots.filter(
      (slot) => !bookedSlotIds.has(slot._id.toString()),
    )

    return res.status(200).json({
      success: true,
      facility: {
        id: facility._id,
        name: facility.name,
        city: facility.city,
      },
      vehicleType,
      durationHours: Number(durationHours.toFixed(2)),
      estimatedPricing: calculatePricing(rate, durationHours),
      count: availableSlots.length,
      availableSlots,
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      })
    }

    console.error('Checking slot availability failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to check parking availability.',
    })
  }
}

// GET: Retrieve the authenticated customer's bookings.
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.dbUser._id,
    })
      .populate('facility', 'name address city state')
      .populate('slot', 'slotNumber vehicleType floor section')
      .populate(
        'vehicle',
        'registrationNumber type make model color',
      )
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    })
  } catch (error) {
    console.error('Fetching bookings failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch your bookings.',
    })
  }
}

// POST: Create a booking with overlap protection.
const createBooking = async (req, res) => {
  const { facilityId, slotId, vehicleId } = req.body

  if (
    !mongoose.isValidObjectId(facilityId) ||
    !mongoose.isValidObjectId(slotId) ||
    !mongoose.isValidObjectId(vehicleId)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Valid facility, slot and vehicle selections are required.',
    })
  }

  let bookingDates

  try {
    bookingDates = validateBookingDates(
      req.body.startTime,
      req.body.endTime,
    )
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      message: error.message,
    })
  }

  const {
    startTime,
    endTime,
    durationHours,
  } = bookingDates

  const session = await mongoose.startSession()
  let createdBooking = null

  try {
    await session.withTransaction(async () => {
      // Verify facility.
      const facility = await Facility.findOne({
        _id: facilityId,
        status: 'Active',
      }).session(session)

      if (!facility) {
        throw bookingError(404, 'Active parking facility not found.')
      }

      // Verify that the vehicle belongs to the logged-in customer.
      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        user: req.dbUser._id,
      }).session(session)

      if (!vehicle) {
        throw bookingError(
          404,
          'Selected vehicle was not found in your account.',
        )
      }

      // Verify that the selected slot supports the customer's vehicle.
      if (!VALID_VEHICLE_TYPES.includes(vehicle.type)) {
        throw bookingError(400, 'Invalid vehicle type.')
      }

      const slot = await Slot.findOne({
        _id: slotId,
        facility: facility._id,
        vehicleType: vehicle.type,
        status: { $in: ['Available', 'Occupied'] },
      }).session(session)

      if (!slot) {
        throw bookingError(
          409,
          'Selected parking slot is not available for this vehicle.',
        )
      }

      const rate = facility.rates.find(
        (item) => item.vehicleType === vehicle.type,
      )

      if (!rate) {
        throw bookingError(
          400,
          'Parking rates are not configured for this vehicle type.',
        )
      }

      /*
       * Atomically write to the slot document.
       * Concurrent booking attempts for the same slot must
       * serialize through this write before checking overlaps.
       */
      const lockResult = await Slot.updateOne(
        {
          _id: slot._id,
          status: { $in: ['Available', 'Occupied'] },
        },
        {
          $inc: { reservationVersion: 1 },
        },
        { session },
      )

      if (lockResult.modifiedCount !== 1) {
        throw bookingError(
          409,
          'This parking slot is no longer available.',
        )
      }

      // Check for an overlapping confirmed booking.
      const conflictingBooking = await Booking.findOne({
        slot: slot._id,
        status: { $in: ['Pending Payment', 'Confirmed'] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      }).session(session)

      if (conflictingBooking) {
        throw bookingError(
          409,
          'This slot is already booked during the selected time period. Please select another slot or time.',
        )
      }

      const pricing = calculatePricing(rate, durationHours)

      const bookingReference =
        `PE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

      const bookings = await Booking.create(
        [
          {
            bookingReference,
            user: req.dbUser._id,
            facility: facility._id,
            slot: slot._id,
            vehicle: vehicle._id,
            startTime,
            endTime,
            durationHours: Number(durationHours.toFixed(2)),
            ...pricing,
            currency: 'INR',
            status: 'Pending Payment',
            paymentStatus: 'Pending',
          },
        ],
        { session },
      )

      createdBooking = bookings[0]
    })

    const populatedBooking = await Booking.findById(createdBooking._id)
      .populate('facility', 'name address city state')
      .populate('slot', 'slotNumber vehicleType floor section')
      .populate('vehicle', 'registrationNumber type make model')

    return res.status(201).json({
      success: true,
      message: 'Parking booking created successfully.',
      booking: populatedBooking,
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      })
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Booking reference conflict. Please retry.',
      })
    }

    console.error('Creating booking failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to create parking booking.',
    })
  } finally {
    await session.endSession()
  }
}

// PATCH: Cancel a future booking owned by the customer.

const cancelBooking = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      })
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.dbUser._id,
    })

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      })
    }

    if (
      !['Pending Payment', 'Confirmed'].includes(booking.status)
    ) {
      return res.status(409).json({
        success: false,
        message: 'This booking cannot be cancelled.',
      })
    }

    if (booking.paymentStatus === 'Paid') {
      return res.status(409).json({
        success: false,
        message: 'Paid bookings require refund processing before cancellation.',
      })
    }

    if (booking.startTime <= new Date()) {
      return res.status(409).json({
        success: false,
        message: 'A booking cannot be cancelled after its start time.',
      })
    }

    booking.status = 'Cancelled'
    booking.cancelledAt = new Date()

    await booking.save()

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully.',
      booking,
    })
  } catch (error) {
    console.error('Cancelling booking failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to cancel booking.',
    })
  }
}


module.exports = {
  getAvailableSlots,
  getMyBookings,
  createBooking,
  cancelBooking,
}
