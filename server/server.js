
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const { createServer } = require('http')
const verifyToken = require('./middleware/authMiddleware')
const adminRoutes = require('./routes/adminRoutes')
const authRoutes = require('./routes/authRoutes')
const vehicleRoutes = require('./routes/vehicleRoutes')
const facilityRoutes = require('./routes/facilityRoutes')
const slotRoutes = require('./routes/slotRoutes')
const bookingRoutes = require('./routes/bookingRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const operationsRoutes = require('./routes/operationsRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const { initializeSocket } = require('./config/socket')
const { startReminderScheduler } = require('./services/reminderScheduler')
const app = express()

// Create one HTTP server for Express and Socket.IO.
const httpServer = createServer(app)

// Initialize authenticated WebSocket connections.
const io = initializeSocket(httpServer)

// Make Socket.IO accessible to API controllers.
app.set('io', io)
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}))

app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/facilities', facilityRoutes)
app.use('/api/slots', slotRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/operations', operationsRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)
// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to ParkEase API',
    version: '1.0.0',
  })
})

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ParkEase backend is running successfully',
    server: 'Express.js',
    database: 'Connected',
  })
})

// Protected authentication verification route
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication verified successfully.',
    user: {
      uid: req.user.uid,
      email: req.user.email,
      emailVerified: req.user.email_verified,
    },
  })
})

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  })
})

// Connect database before starting server
// Connect database before starting the HTTP and WebSocket server.
const startServer = async () => {
  await connectDB()

  startReminderScheduler(io)

  httpServer.listen(PORT, () => {
    console.log(`ParkEase API running at http://localhost:${PORT}`)
    console.log('Socket.IO server initialized successfully.')
  })
}


startServer()
