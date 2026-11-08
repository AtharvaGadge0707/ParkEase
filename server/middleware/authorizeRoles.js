
const User = require('../models/User')

// Allow access only to users with one of the specified roles.
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findOne({
        firebaseUid: req.user.uid,
      }).select('role assignedFacility')

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found.',
        })
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this resource.',
        })
      }

      // Attach trusted MongoDB profile information.
      req.dbUser = user

      next()
    } catch (error) {
      console.error('Role authorization failed:', error.message)

      return res.status(500).json({
        success: false,
        message: 'Unable to verify user permissions.',
      })
    }
  }
}

module.exports = authorizeRoles
