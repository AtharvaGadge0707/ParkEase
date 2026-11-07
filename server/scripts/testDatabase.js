
require('dotenv').config()

const mongoose = require('mongoose')

const testDatabase = async () => {
  let collection

  try {
    await mongoose.connect(process.env.MONGODB_URI)

    console.log('Database connection established.')

    const db = mongoose.connection.db

    const collectionName = `connection_checks_${Date.now()}`

    collection = await db.createCollection(collectionName)

    // Insert a test document
    const insertResult = await collection.insertOne({
      project: 'ParkEase',
      message: 'MongoDB read/write test successful',
      createdAt: new Date(),
    })

    console.log('Document inserted:', insertResult.insertedId)

    // Retrieve the document
    const savedDocument = await collection.findOne({
      _id: insertResult.insertedId,
    })

    console.log('Retrieved document:', savedDocument)

    // Delete the test document
    await collection.deleteOne({
      _id: insertResult.insertedId,
    })

    console.log('Test document deleted successfully.')

    // Remove the temporary collection
    await db.dropCollection(collectionName)

    console.log('Temporary collection removed.')
    console.log('MongoDB read/write test PASSED.')
  } catch (error) {
    console.error('Database test failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

testDatabase()
