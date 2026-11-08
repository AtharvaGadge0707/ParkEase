
const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')

const {
  getMyPayments,
  processPayment,
} = require('../controllers/paymentController')

router.use(verifyToken, authorizeRoles('Customer'))

router.get('/my', getMyPayments)
router.post('/:bookingId/process', processPayment)

module.exports = router
