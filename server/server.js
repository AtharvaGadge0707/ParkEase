
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')

const app = express()

const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}))

app.use(express.json())

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

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  })
})

// Connect database before starting server
const startServer = async () => {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`ParkEase API running at http://localhost:${PORT}`)
  })
}

startServer()
