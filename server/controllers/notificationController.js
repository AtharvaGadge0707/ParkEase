const mongoose = require('mongoose')
const Notification = require('../models/Notification')

// Get notifications belonging to the authenticated user.
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.dbUser._id

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),

      Notification.countDocuments({
        user: userId,
        readAt: null,
      }),
    ])

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    })
  } catch (error) {
    console.error('Fetching notifications failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch notifications.',
    })
  }
}

// Mark one notification as read.
const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID.',
      })
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.dbUser._id,
      },
      {
        $set: { readAt: new Date() },
      },
      { new: true },
    )

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to update notification.',
    })
  }
}

// Mark all the authenticated user's notifications as read.
const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user: req.dbUser._id,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    )

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to update notifications.',
    })
  }
}

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
}