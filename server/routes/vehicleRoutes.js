const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')

const {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController')

// Only authenticated Customers can manage their own vehicles.
router.use(verifyToken, authorizeRoles('Customer'))

router.get('/', getVehicles)
router.post('/', createVehicle)
router.put('/:id', updateVehicle)
router.delete('/:id', deleteVehicle)

module.exports = router