const mongoose = require('mongoose')
const User = require('../models/User')
const Vehicle = require('../models/Vehicle')

const getOwner = async (firebaseUid) => {
  return User.findOne({ firebaseUid }).select('_id')
}

// GET: List the authenticated customer's vehicles.
const getVehicles = async (req, res) => {
  try {
    const owner = await getOwner(req.user.uid)

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    const vehicles = await Vehicle.find({ user: owner._id })
      .sort({ isDefault: -1, createdAt: -1 })

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    })
  } catch (error) {
    console.error('Fetching vehicles failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch vehicles.',
    })
  }
}

// POST: Add a vehicle.
const createVehicle = async (req, res) => {
  try {
    const owner = await getOwner(req.user.uid)

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    const {
      registrationNumber,
      type,
      make = '',
      model = '',
      color = '',
      nickname = '',
      isDefault = false,
    } = req.body

    if (
      typeof registrationNumber !== 'string' ||
      typeof type !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Registration number and vehicle type are required.',
      })
    }

    const normalizedNumber = registrationNumber.trim().toUpperCase()

    const duplicate = await Vehicle.findOne({
      user: owner._id,
      registrationNumber: normalizedNumber,
    })

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This vehicle is already registered to your account.',
      })
    }

    const vehicle = await Vehicle.create({
      user: owner._id,
      registrationNumber: normalizedNumber,
      type,
      make,
      model,
      color,
      nickname,
      isDefault: false,
    })

    const otherVehicleExists = await Vehicle.exists({
      user: owner._id,
      _id: { $ne: vehicle._id },
    })

    if (isDefault === true || !otherVehicleExists) {
      await Vehicle.updateMany(
        { user: owner._id, _id: { $ne: vehicle._id } },
        { $set: { isDefault: false } },
      )

      vehicle.isDefault = true
      await vehicle.save()
    }

    return res.status(201).json({
      success: true,
      message: 'Vehicle added successfully.',
      vehicle,
    })
  } catch (error) {
    console.error('Adding vehicle failed:', error.message)

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This registration number already exists.',
      })
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to add vehicle.',
    })
  }
}

// PUT: Update an existing vehicle belonging to the customer.
const updateVehicle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      })
    }

    const owner = await getOwner(req.user.uid)

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: owner._id,
    })

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      })
    }

    const allowedFields = [
      'registrationNumber',
      'type',
      'make',
      'model',
      'color',
      'nickname',
    ]

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        vehicle[field] =
          field === 'registrationNumber' &&
          typeof req.body[field] === 'string'
            ? req.body[field].trim().toUpperCase()
            : req.body[field]
      }
    }

    const wasDefault = vehicle.isDefault

    if (req.body.isDefault === true) {
      await Vehicle.updateMany(
        { user: owner._id, _id: { $ne: vehicle._id } },
        { $set: { isDefault: false } },
      )

      vehicle.isDefault = true
    } else if (req.body.isDefault === false) {
      vehicle.isDefault = false
    }

    await vehicle.save()

    if (req.body.isDefault === false && wasDefault) {
      const replacement = await Vehicle.findOne({
        user: owner._id,
        _id: { $ne: vehicle._id },
      }).sort({ createdAt: -1 })

      if (replacement) {
        replacement.isDefault = true
        await replacement.save()
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully.',
      vehicle,
    })
  } catch (error) {
    console.error('Updating vehicle failed:', error.message)

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This registration number is already registered.',
      })
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update vehicle.',
    })
  }
}

// DELETE: Delete a vehicle belonging to the customer.
const deleteVehicle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      })
    }

    const owner = await getOwner(req.user.uid)

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      user: owner._id,
    })

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      })
    }

    if (vehicle.isDefault) {
      const replacement = await Vehicle.findOne({
        user: owner._id,
      }).sort({ createdAt: -1 })

      if (replacement) {
        replacement.isDefault = true
        await replacement.save()
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully.',
    })
  } catch (error) {
    console.error('Deleting vehicle failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to delete vehicle.',
    })
  }
}

module.exports = {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
}