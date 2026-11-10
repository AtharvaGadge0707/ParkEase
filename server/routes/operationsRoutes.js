const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')

const {
  findBooking,
  checkInVehicle,
  checkOutVehicle,
  getActiveSessions,
  getStaffDashboard,
  getEntryQueue,
} = require('../controllers/operationsController')

router.use(
  verifyToken,
  authorizeRoles('Parking Staff', 'Administrator'),
)

router.get('/sessions', getActiveSessions)
router.get('/dashboard', getStaffDashboard)
router.get('/booking/:bookingReference', findBooking)
router.get('/entry-queue', getEntryQueue)
router.post('/entry', checkInVehicle)
router.post('/:bookingId/exit', checkOutVehicle)

module.exports = router