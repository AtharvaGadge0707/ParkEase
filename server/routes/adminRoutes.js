
const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')

// Administrator-only access check.
router.get(
  '/access-check',
  verifyToken,
  authorizeRoles('Administrator'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Administrator access verified.',
      role: req.dbUser.role,
    })
  }
)

module.exports = router
