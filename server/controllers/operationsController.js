
const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Slot = require('../models/Slot')
const Facility = require('../models/Facility')
const {
  createAndSendNotification,
} = require('../services/notificationService')

const {
  scheduleBookingReminder,
  cancelBookingReminder,
} = require('../services/reminderScheduler')

// Send customer notifications after a booking operation has committed.
const sendBookingNotification = async (io, bookingId, type) => {
  if (!io) return

  try {
    const booking = await Booking.findById(bookingId)
      .populate('facility', 'name')
      .populate('vehicle', 'registrationNumber')
      .lean()

    if (!booking) return

    const facilityName = booking.facility?.name || 'your parking facility'
    const vehicleNumber =
      booking.vehicle?.registrationNumber || 'your vehicle'

    const notificationDetails = {
      VEHICLE_CHECKED_IN: {
        title: 'Vehicle Checked In',
        message: `Your vehicle ${vehicleNumber} has been checked in at ${facilityName}.`,
      },
      VEHICLE_CHECKED_OUT: {
        title: 'Vehicle Checked Out',
        message: `Your vehicle ${vehicleNumber} has been checked out from ${facilityName}.`,
      },
    }

    const details = notificationDetails[type]
    if (!details) return

    await createAndSendNotification(io, {
      userId: booking.user,
      type,
      title: details.title,
      message: details.message,
      bookingId: booking._id,
      metadata: {
        bookingReference: booking.bookingReference,
        facilityName,
        vehicleNumber,
      },
    })
  } catch (error) {
    // The booking transaction has already committed. A notification failure
    // must not turn a successful check-in/check-out into a failed API response.
    console.error(`Sending ${type} notification failed:`, error.message)
  }
}

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

    const io = req.app.get('io')

    // Notify the customer after the check-in transaction succeeds.
    await sendBookingNotification(
      io,
      updatedBooking._id,
      'VEHICLE_CHECKED_IN',
    )

    // Start the 10-minute-before-endTime reminder for this active session.
    if (io) {
      try {
        const reminderBooking = await Booking.findById(updatedBooking._id)
          .select(
            '_id user bookingReference facility vehicle startTime endTime entryTime exitTime status reminderSentAt',
          )
          .lean()

        if (reminderBooking) {
          scheduleBookingReminder(reminderBooking, io)
        }
      } catch (error) {
        console.error('Scheduling parking-end reminder failed:', error.message)
      }
    }

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

    // Cancel any pending reminder because the vehicle has checked out.
    cancelBookingReminder(updatedBooking._id)

    // Notify the customer after the check-out transaction succeeds.
    await sendBookingNotification(
      req.app.get('io'),
      updatedBooking._id,
      'VEHICLE_CHECKED_OUT',
    )

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

// Get facility operations statistics for staff and administrators.
const getStaffDashboard = async (req, res) => {
  try {
    // Validate staff facility assignment.
    const accessFilter = getFacilityFilter(req.dbUser)

    const facilityQuery =
      req.dbUser.role === 'Parking Staff'
        ? { _id: accessFilter.facility }
        : {}

    const facilities = await Facility.find(facilityQuery)
      .select('name city state status totalCapacity')
      .sort({ name: 1 })
      .lean()

    const facilityIds = facilities.map((facility) => facility._id)

    // Calculate today's date using the Indian timezone.
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())

    const dateValues = Object.fromEntries(
      dateParts.map((part) => [part.type, part.value]),
    )

    const today = `${dateValues.year}-${dateValues.month}-${dateValues.day}`
    const startOfDay = new Date(`${today}T00:00:00+05:30`)
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const [slotStats, bookingStats] = await Promise.all([
      Slot.aggregate([
        {
          $match: {
            facility: { $in: facilityIds },
          },
        },
        {
          $group: {
            _id: '$facility',
            total: { $sum: 1 },
            available: {
              $sum: { $cond: [{ $eq: ['$status', 'Available'] }, 1, 0] },
            },
            reserved: {
              $sum: { $cond: [{ $eq: ['$status', 'Reserved'] }, 1, 0] },
            },
            occupied: {
              $sum: { $cond: [{ $eq: ['$status', 'Occupied'] }, 1, 0] },
            },
            unavailable: {
              $sum: { $cond: [{ $eq: ['$status', 'Unavailable'] }, 1, 0] },
            },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            facility: { $in: facilityIds },
          },
        },
        {
          $group: {
            _id: '$facility',
            activeVehicles: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'Confirmed'] },
                      { $ne: ['$entryTime', null] },
                      { $eq: ['$exitTime', null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            todayEntries: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$entryTime', startOfDay] },
                      { $lt: ['$entryTime', endOfDay] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            todayExits: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$exitTime', startOfDay] },
                      { $lt: ['$exitTime', endOfDay] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ])

    const slotMap = new Map(
      slotStats.map((item) => [item._id.toString(), item]),
    )

    const bookingMap = new Map(
      bookingStats.map((item) => [item._id.toString(), item]),
    )

    const facilityDetails = facilities.map((facility) => {
      const id = facility._id.toString()
      const slots = slotMap.get(id) || {}
      const bookings = bookingMap.get(id) || {}

      return {
        _id: facility._id,
        name: facility.name,
        city: facility.city,
        state: facility.state,
        status: facility.status,
        totalCapacity: facility.totalCapacity,
        slots: {
          total: slots.total || 0,
          available: slots.available || 0,
          reserved: slots.reserved || 0,
          occupied: slots.occupied || 0,
          unavailable: slots.unavailable || 0,
        },
        activeVehicles: bookings.activeVehicles || 0,
        todayEntries: bookings.todayEntries || 0,
        todayExits: bookings.todayExits || 0,
      }
    })

    const summary = facilityDetails.reduce(
      (totals, facility) => {
        totals.totalFacilities += 1
        totals.totalCapacity += facility.totalCapacity
        totals.totalSlots += facility.slots.total
        totals.availableSlots += facility.slots.available
        totals.reservedSlots += facility.slots.reserved
        totals.occupiedSlots += facility.slots.occupied
        totals.unavailableSlots += facility.slots.unavailable
        totals.activeVehicles += facility.activeVehicles
        totals.todayEntries += facility.todayEntries
        totals.todayExits += facility.todayExits

        return totals
      },
      {
        totalFacilities: 0,
        totalCapacity: 0,
        totalSlots: 0,
        availableSlots: 0,
        reservedSlots: 0,
        occupiedSlots: 0,
        unavailableSlots: 0,
        activeVehicles: 0,
        todayEntries: 0,
        todayExits: 0,
      },
    )

    return res.status(200).json({
      success: true,
      date: today,
      summary,
      facilities: facilityDetails,
    })
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Unable to fetch dashboard statistics.',
    })
  }
}

// Get upcoming bookings for the Entry / Exit dashboard.
const getEntryQueue = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req.dbUser)

    const bookings = await Booking.find({
      ...facilityFilter,
      status: { $in: ['Pending Payment', 'Confirmed'] },
      entryTime: null,
      exitTime: null,
      endTime: { $gt: new Date() },
    })
      .populate('user', 'name email phone')
      .populate('facility', 'name address city')
      .populate('slot', 'slotNumber vehicleType floor section')
      .populate(
        'vehicle',
        'registrationNumber type make model color',
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    })
  } catch (error) {
    console.error('Fetching entry queue failed:', error.message)

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Unable to fetch upcoming bookings.',
    })
  }
}

module.exports = {
  findBooking,
  checkInVehicle,
  checkOutVehicle,
  getActiveSessions,
  getStaffDashboard,
  getEntryQueue,
}
