
const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')

const {
  getActiveFacilities,
  getAllFacilities,
  createFacility,
  updateFacility,
  deactivateFacility,
} = require('../controllers/facilityController')

router.use(verifyToken)

// All authenticated roles can view active facilities.
router.get('/', getActiveFacilities)

// Only administrators can view all facilities, including inactive ones.
router.get(
  '/manage',
  authorizeRoles('Administrator'),
  getAllFacilities,
)

// Administrator-only management endpoints.
router.post(
  '/',
  authorizeRoles('Administrator'),
  createFacility,
)

router.put(
  '/:id',
  authorizeRoles('Administrator'),
  updateFacility,
)

router.delete(
  '/:id',
  authorizeRoles('Administrator'),
  deactivateFacility,
)

module.exports = router
