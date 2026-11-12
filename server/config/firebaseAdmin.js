
const fs = require('fs')
const path = require('path')

const {
  initializeApp,
  getApps,
  cert,
} = require('firebase-admin/app')

const { getAuth } = require('firebase-admin/auth')

// Use Render's secret-file path in production.
// If not configured, use the local service-account file.
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || path.join(__dirname, 'firebase-service-account.json')

// Check that the credentials file exists.
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `Firebase service account file not found: ${serviceAccountPath}`
  )
}

// Read Firebase Admin credentials.
const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, 'utf8')
)

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
