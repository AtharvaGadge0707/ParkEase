const Booking = require('../models/Booking')
const { createAndSendNotification } = require('./notificationService')

const REMINDER_OFFSET = 10 * 60 * 1000
const REFRESH_INTERVAL = 60 * 1000

const scheduledTimers = new Map()
let refreshInterval = null

// Schedule a reminder for one active parking session.
const scheduleBookingReminder = (booking, io) => {
  if (
    !booking?._id ||
    !booking.entryTime ||
    booking.exitTime ||
    booking.reminderSentAt ||
    booking.status !== 'Confirmed'
  ) {
    return
  }

  const bookingId = booking._id.toString()

  // Avoid scheduling the same booking more than once.
  if (scheduledTimers.has(bookingId)) return

  const reminderTime =
    new Date(booking.endTime).getTime() - REMINDER_OFFSET

  const delay = Math.max(0, reminderTime - Date.now())

  const timer = setTimeout(async () => {
    scheduledTimers.delete(bookingId)

    try {
      const sentAt = new Date()

      // Atomically claim the reminder only if the vehicle
      // is still checked in and the reminder has not been sent.
      const dueBooking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          status: 'Confirmed',
          entryTime: { $ne: null },
          exitTime: null,
          reminderSentAt: null,
          endTime: { $gt: sentAt },
        },
        {
          $set: { reminderSentAt: sentAt },
        },
        { new: true },
      )
        .populate('facility', 'name')
        .populate('vehicle', 'registrationNumber')

      if (!dueBooking) return

      await createAndSendNotification(io, {
        userId: dueBooking.user,
        type: 'PARKING_ENDING_SOON',
        title: 'Parking Ending Soon',
        message: `Your parking session at ${dueBooking.facility?.name || 'your parking facility'} is scheduled to end in approximately 10 minutes. Please prepare your vehicle for checkout.`,
        bookingId: dueBooking._id,
        metadata: {
          bookingReference: dueBooking.bookingReference,
          facilityName: dueBooking.facility?.name || '',
          vehicleRegistration:
            dueBooking.vehicle?.registrationNumber || '',
        },
      })

      console.log(
        `Parking reminder sent for booking ${dueBooking.bookingReference}`,
      )
    } catch (error) {
      console.error(
        `Parking reminder failed for ${bookingId}:`,
        error.message,
      )
    }
  }, delay)

  timer.unref()
  scheduledTimers.set(bookingId, timer)
}

// Cancel a pending reminder when the vehicle checks out.
const cancelBookingReminder = (bookingId) => {
  const id = bookingId.toString()
  const timer = scheduledTimers.get(id)

  if (timer) {
    clearTimeout(timer)
    scheduledTimers.delete(id)
  }
}

// Restore active-session reminders on server startup and
// periodically detect sessions that need scheduling.
const startReminderScheduler = (io) => {
  const refreshActiveReminders = async () => {
    try {
      const activeBookings = await Booking.find({
        status: 'Confirmed',
        entryTime: { $ne: null },
        exitTime: null,
        reminderSentAt: null,
        endTime: { $gt: new Date() },
      }).select(
        '_id user bookingReference facility vehicle endTime entryTime exitTime status reminderSentAt',
      )

      for (const booking of activeBookings) {
        scheduleBookingReminder(booking, io)
      }
    } catch (error) {
      console.error(
        'Refreshing parking reminders failed:',
        error.message,
      )
    }
  }

  if (refreshInterval) return

  refreshActiveReminders()

  refreshInterval = setInterval(
    refreshActiveReminders,
    REFRESH_INTERVAL,
  )

  refreshInterval.unref()

  console.log('Parking end-time reminder scheduler started.')
}

module.exports = {
  scheduleBookingReminder,
  cancelBookingReminder,
  startReminderScheduler,
}