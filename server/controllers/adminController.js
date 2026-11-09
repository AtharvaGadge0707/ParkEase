const mongoose = require('mongoose')
const User = require('../models/User')
const Facility = require('../models/Facility')
const Slot = require('../models/Slot')
const Booking = require('../models/Booking')

// Get users for administrator management.
const getUsers = async (req, res) => {
  try {
    const { search = '', role = '' } = req.query
    const filter = {}

    if (role && ['Customer', 'Parking Staff', 'Administrator'].includes(role)) {
      filter.role = role
    }

    if (search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { phone: { $regex: escapedSearch, $options: 'i' } },
      ]
    }

    const users = await User.find(filter)
      .select('-firebaseUid')
      .populate('assignedFacility', 'name city status')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch users.',
    })
  }
}

// Update a user's role and facility assignment.
const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { role, assignedFacility } = req.body

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      })
    }

    const validRoles = ['Customer', 'Parking Staff', 'Administrator']

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid user role.',
      })
    }

    const targetUser = await User.findById(id)

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    // Prevent an administrator from demoting their own account.
    if (
      targetUser._id.toString() === req.dbUser._id.toString() &&
      role !== 'Administrator'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own administrator role.',
      })
    }

    // Prevent removal of the last administrator.
    if (
      targetUser.role === 'Administrator' &&
      role !== 'Administrator'
    ) {
      const administratorCount = await User.countDocuments({
        role: 'Administrator',
      })

      if (administratorCount <= 1) {
        return res.status(409).json({
          success: false,
          message: 'The last administrator account cannot be demoted.',
        })
      }
    }

    if (role === 'Parking Staff') {
      if (!mongoose.isValidObjectId(assignedFacility)) {
        return res.status(400).json({
          success: false,
          message: 'A valid facility must be assigned to Parking Staff.',
        })
      }

      const facility = await Facility.findOne({
        _id: assignedFacility,
        status: 'Active',
      })

      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'The selected active facility was not found.',
        })
      }

      targetUser.assignedFacility = facility._id
    } else {
      targetUser.assignedFacility = null
    }

    targetUser.role = role

    await targetUser.save()

    const updatedUser = await User.findById(targetUser._id)
      .select('-firebaseUid')
      .populate('assignedFacility', 'name city status')
      .lean()

    return res.status(200).json({
      success: true,
      message: 'User role and facility assignment updated successfully.',
      user: updatedUser,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to update user.',
    })
  }
}

// Get system-wide administration statistics.
const getAdminOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      customers,
      parkingStaff,
      administrators,
      totalFacilities,
      activeFacilities,
      inactiveFacilities,
      totalSlots,
      availableSlots,
      reservedSlots,
      occupiedSlots,
      unavailableSlots,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      activeSessions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'Customer' }),
      User.countDocuments({ role: 'Parking Staff' }),
      User.countDocuments({ role: 'Administrator' }),
      Facility.countDocuments(),
      Facility.countDocuments({ status: 'Active' }),
      Facility.countDocuments({ status: 'Inactive' }),
      Slot.countDocuments(),
      Slot.countDocuments({ status: 'Available' }),
      Slot.countDocuments({ status: 'Reserved' }),
      Slot.countDocuments({ status: 'Occupied' }),
      Slot.countDocuments({ status: 'Unavailable' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'Pending Payment' }),
      Booking.countDocuments({ status: 'Confirmed' }),
      Booking.countDocuments({ status: 'Completed' }),
      Booking.countDocuments({ status: 'Cancelled' }),
      Booking.countDocuments({
        status: 'Confirmed',
        entryTime: { $ne: null },
        exitTime: null,
      }),
    ])

    return res.status(200).json({
      success: true,
      overview: {
        users: {
          total: totalUsers,
          customers,
          parkingStaff,
          administrators,
        },
        facilities: {
          total: totalFacilities,
          active: activeFacilities,
          inactive: inactiveFacilities,
        },
        slots: {
          total: totalSlots,
          available: availableSlots,
          reserved: reservedSlots,
          occupied: occupiedSlots,
          unavailable: unavailableSlots,
        },
        bookings: {
          total: totalBookings,
          pendingPayment: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          activeSessions,
        },
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch administration overview.',
    })
  }
}

module.exports = {
  getUsers,
  updateUser,
  getAdminOverview,
}