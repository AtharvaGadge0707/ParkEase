const express = require('express')
const router = express.Router()

const verifyToken = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles')
const { getReports } = require('../controllers/reportController')
const {
  getUsers,
  updateUser,
  getAdminOverview,
} = require('../controllers/adminController')

router.use(verifyToken, authorizeRoles('Administrator'))

router.get('/access-check', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Administrator access verified.',
    role: req.dbUser.role,
  })
})

router.get('/overview', getAdminOverview)
router.get('/users', getUsers)
router.get('/reports', getReports)
router.patch('/users/:id', updateUser)


module.exports = router