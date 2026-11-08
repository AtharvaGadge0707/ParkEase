
const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')

const {
  getFacilitySlots,
  createSlot,
  updateSlot,
  updateSlotStatus,
  deactivateSlot,
} = require('../controllers/slotController')

router.use(verifyToken)

// All three roles can view slots, with customer results filtered to Available.
router.get(
  '/facility/:facilityId',
  authorizeRoles('Customer', 'Parking Staff', 'Administrator'),
  getFacilitySlots,
)

// Administrators create and edit slot definitions.
router.post(
  '/',
  authorizeRoles('Administrator'),
  createSlot,
)

router.put(
  '/:id',
  authorizeRoles('Administrator'),
  updateSlot,
)

// Staff and administrators manage operational statuses.
router.patch(
  '/:id/status',
  authorizeRoles('Parking Staff', 'Administrator'),
  updateSlotStatus,
)

// Administrators can deactivate a slot.
router.delete(
  '/:id',
  authorizeRoles('Administrator'),
  deactivateSlot,
)

module.exports = router
