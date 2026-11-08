const { adminAuth } = require('../config/firebaseAdmin')
const User = require('../models/User')

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  role: user.role,
})

const syncUserProfile = async (req, res) => {
  try {
    const firebaseUid = req.user.uid
    const firebaseUser = await adminAuth.getUser(firebaseUid)

    if (!firebaseUser.email) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      })
    }

    const name =
      firebaseUser.displayName?.trim() ||
      firebaseUser.email.split('@')[0]

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        $set: {
          name,
          email: firebaseUser.email,
        },
        $setOnInsert: {
          firebaseUid,
          role: 'Customer',
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    )

    return res.status(200).json({
      success: true,
      message: 'User profile synchronized successfully.',
      user: formatUser(user),
    })
  } catch (error) {
    console.error('User profile synchronization failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to synchronize user profile.',
    })
  }
}

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    return res.status(200).json({
      success: true,
      user: formatUser(user),
    })
  } catch (error) {
    console.error('Fetching profile failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch user profile.',
    })
  }
}

const updateUserProfile = async (req, res) => {
  try {
    const { name, phone = '' } = req.body

    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      name.trim().length > 60
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name must contain between 2 and 60 characters.',
      })
    }

    if (
      typeof phone !== 'string' ||
      phone.length > 20 ||
      (phone && !/^[+0-9() -]+$/.test(phone))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number.',
      })
    }

    const firebaseUid = req.user.uid

    // Update the trusted Firebase display name.
    await adminAuth.updateUser(firebaseUid, {
      displayName: name.trim(),
    })

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        $set: {
          name: name.trim(),
          phone: phone.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: formatUser(user),
    })
  } catch (error) {
    console.error('Updating profile failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to update user profile.',
    })
  }
}

module.exports = {
  syncUserProfile,
  getUserProfile,
  updateUserProfile,
}