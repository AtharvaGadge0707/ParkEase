const { Server } = require('socket.io')
const { adminAuth } = require('./firebaseAdmin')
const User = require('../models/User')

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token

      if (!token) {
        return next(new Error('Authentication token is required.'))
      }

      const decodedToken = await adminAuth.verifyIdToken(token)

      const user = await User.findOne({
        firebaseUid: decodedToken.uid,
      }).select('_id role')

      if (!user) {
        return next(new Error('User profile not found.'))
      }

      socket.data.userId = user._id.toString()
      socket.data.role = user.role

      next()
    } catch (error) {
      console.error('Socket authentication failed:', error.message)
      next(new Error('Socket authentication failed.'))
    }
  })

  io.on('connection', (socket) => {
    const room = `user:${socket.data.userId}`

    socket.join(room)

    console.log(`Socket connected for user ${socket.data.userId}`)

    socket.on('disconnect', () => {
      console.log(`Socket disconnected for user ${socket.data.userId}`)
    })
  })

  return io
}

module.exports = { initializeSocket }