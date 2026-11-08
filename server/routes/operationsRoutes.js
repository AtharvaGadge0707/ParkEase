const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')

const {
  findBooking,
  checkInVehicle,
  checkOutVehicle,
  getActiveSessions,
} = require('../controllers/operationsController')

router.use(
  verifyToken,
  authorizeRoles('Parking Staff', 'Administrator'),
)

router.get('/sessions', getActiveSessions)
router.get('/booking/:bookingReference', findBooking)
router.post('/entry', checkInVehicle)
router.post('/:bookingId/exit', checkOutVehicle)

module.exports = router