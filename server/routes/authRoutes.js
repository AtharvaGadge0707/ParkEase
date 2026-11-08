const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')

const {
  syncUserProfile,
  getUserProfile,
  updateUserProfile,
} = require('../controllers/authController')

// Synchronize Firebase identity with MongoDB.
router.post('/profile', verifyToken, syncUserProfile)

// Get the authenticated user's profile.
router.get('/profile', verifyToken, getUserProfile)

// Update name and phone number.
router.put('/profile', verifyToken, updateUserProfile)

module.exports = router