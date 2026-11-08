
const { adminAuth } = require('../config/firebaseAdmin')

// Verify Firebase ID token sent by the frontend.
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    // Check whether the Authorization header exists.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing.',
      })
    }

    // Extract the Firebase ID token.
    const token = authHeader.split(' ')[1]

    // Verify token using Firebase Admin SDK.
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Attach authenticated user information to the request.
    req.user = decodedToken

    next()
  } catch (error) {
    console.error('Token verification failed:', error.message)

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    })
  }
}

module.exports = verifyToken
