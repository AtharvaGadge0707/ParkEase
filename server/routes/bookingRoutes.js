
const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')

const {
  getAvailableSlots,
  getMyBookings,
  createBooking,
  cancelBooking,
} = require('../controllers/bookingController')

router.use(verifyToken, authorizeRoles('Customer'))

router.get('/availability', getAvailableSlots)
router.get('/my', getMyBookings)
router.post('/', createBooking)
router.patch('/:id/cancel', cancelBooking)

module.exports = router
