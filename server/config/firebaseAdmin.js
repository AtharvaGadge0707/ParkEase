
const {
  initializeApp,
  getApps,
  cert,
} = require('firebase-admin/app')

const { getAuth } = require('firebase-admin/auth')

const serviceAccount = require('./firebase-service-account.json')

// Initialize Firebase Admin only once.
const app = getApps().length === 0
  ? initializeApp({
      credential: cert(serviceAccount),
    })
  : getApps()[0]

// Get Firebase Authentication service.
const adminAuth = getAuth(app)

module.exports = {
  app,
  adminAuth,
}
