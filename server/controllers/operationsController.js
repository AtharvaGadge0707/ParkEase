const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Slot = require('../models/Slot')

const checkFacilityAccess = (booking, user) => {
  if (
    user.role === 'Parking Staff' &&
    (!user.assignedFacility ||
      booking.facility.toString() !== user.assignedFacility.toString())
  ) {
    const error = new Error('You can only manage your assigned facility.')
    error.status = 403
    throw error
  }
}

const getFacilityFilter = (user) => {
  if (user.role === 'Parking Staff') {
    if (!user.assignedFacility) {
      const error = new Error('No facility is assigned to your staff account.')
      error.status = 403
      throw error
    }

    return { facility: user.assignedFacility }
  }

  return {}
}

// Search a booking by its reference.
const findBooking = async (req, res) => {
  try {
    const reference = req.params.bookingReference?.trim().toUpperCase()

    const booking = await Booking.findOne({
      bookingReference: reference,
    })
      .populate('user', 'name email phone')
      .populate('facility', 'name address city')
      .populate('slot', 'slotNumber vehicleType floor section')
      .populate('vehicle', 'registrationNumber type make model color')

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      })
    }

    checkFacilityAccess(
      { facility: booking.facility._id },
      req.dbUser,
    )

    return res.status(200).json({
      success: true,
      booking,
    })
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Unable to find booking.',
    })
  }
}

// Check in a vehicle.
const checkInVehicle = async (req, res) => {
  const reference = req.body.bookingReference?.trim().toUpperCase()

  if (!reference) {
    return res.status(400).json({
      success: false,
      message: 'Booking reference is required.',
    })
  }

  const session = await mongoose.startSession()

  try {
    let updatedBooking

    await session.withTransaction(async () => {
      const booking = await Booking.findOne({
        bookingReference: reference,
      }).session(session)

      if (!booking) {
        const error = new Error('Booking not found.')
        error.status = 404
        throw error
      }

      checkFacilityAccess(booking, req.dbUser)

      if (booking.status !== 'Confirmed' || booking.paymentStatus !== 'Paid') {
        const error = new Error('Only paid, confirmed bookings can check in.')
        error.status = 409
        throw error
      }

      if (booking.entryTime || booking.exitTime) {
        const error = new Error('This booking has already been checked in or completed.')
        error.status = 409
        throw error
      }

      if (booking.endTime <= new Date()) {
        const error = new Error('This booking period has expired.')
        error.status = 409
        throw error
      }

      const slotUpdate = await Slot.updateOne(
        {
          _id: booking.slot,
          status: { $in: ['Available', 'Reserved'] },
        },
        {
          $set: { status: 'Occupied' },
        },
        { session },
      )

      if (slotUpdate.modifiedCount !== 1) {
        const error = new Error('The assigned parking slot is not available for entry.')
        error.status = 409
        throw error
      }

      booking.entryTime = new Date()
      booking.checkedInBy = req.dbUser._id

      await booking.save({ session })

      updatedBooking = booking
    })

    return res.status(200).json({
      success: true,
      message: 'Vehicle entry recorded successfully.',
      booking: updatedBooking,
    })
  } catch (error) {
    console.error('Vehicle check-in failed:', error.message)

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Unable to check in vehicle.',
    })
  } finally {
    await session.endSession()
  }
}

// Check out a vehicle.
const checkOutVehicle = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.bookingId)) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found.',
    })
  }

  const session = await mongoose.startSession()

  try {
    let updatedBooking

    await session.withTransaction(async () => {
      const booking = await Booking.findById(req.params.bookingId).session(session)

      if (!booking) {
        const error = new Error('Booking not found.')
        error.status = 404
        throw error
      }

      checkFacilityAccess(booking, req.dbUser)

      if (!booking.entryTime || booking.exitTime) {
        const error = new Error('This vehicle does not have an active parking session.')
        error.status = 409
        throw error
      }

      const slotUpdate = await Slot.updateOne(
        {
          _id: booking.slot,
          status: 'Occupied',
        },
        {
          $set: { status: 'Available' },
        },
        { session },
      )

      if (slotUpdate.modifiedCount !== 1) {
        const error = new Error('Unable to release the occupied parking slot.')
        error.status = 409
        throw error
      }

      booking.exitTime = new Date()
      booking.checkedOutBy = req.dbUser._id
      booking.status = 'Completed'

      await booking.save({ session })

      updatedBooking = booking
    })

    return res.status(200).json({
      success: true,
      message: 'Vehicle exit recorded and parking slot released.',
      booking: updatedBooking,
    })
  } catch (error) {
    console.error('Vehicle check-out failed:', error.message)

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Unable to check out vehicle.',
    })
  } finally {
    await session.endSession()
  }
}

// Get currently active parking sessions.
const getActiveSessions = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req.dbUser)

    const sessions = await Booking.find({
      ...facilityFilter,
      status: 'Confirmed',
      entryTime: { $ne: null },
      exitTime: null,
    })
      .populate('user', 'name email phone')
      .populate('facility', 'name city')
      .populate('slot', 'slotNumber vehicleType floor section')
      .populate('vehicle', 'registrationNumber type make model')
      .sort({ entryTime: -1 })

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    })
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Unable to fetch active sessions.',
    })
  }
}

module.exports = {
  findBooking,
  checkInVehicle,
  checkOutVehicle,
  getActiveSessions,
}