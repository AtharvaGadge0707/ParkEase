const Notification = require('../models/Notification')

const createAndSendNotification = async (
  io,
  {
    userId,
    type,
    title,
    message,
    bookingId,
    metadata = {},
  },
) => {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    booking: bookingId || null,
    metadata,
  })

  const payload = notification.toObject()

  io.to(`user:${userId.toString()}`).emit(
    'notification:new',
    payload,
  )

  return payload
}

module.exports = { createAndSendNotification }