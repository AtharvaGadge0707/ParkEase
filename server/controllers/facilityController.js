
const mongoose = require('mongoose')
const Facility = require('../models/Facility')
const Slot = require('../models/Slot')

// List active facilities for customers and staff.
const getActiveFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find({ status: 'Active' })
      .sort({ name: 1 })

    return res.status(200).json({
      success: true,
      count: facilities.length,
      facilities,
    })
  } catch (error) {
    console.error('Fetching facilities failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch parking facilities.',
    })
  }
}

// List all facilities for administrators, including inactive ones.
const getAllFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find()
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      count: facilities.length,
      facilities,
    })
  } catch (error) {
    console.error('Fetching all facilities failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch facilities.',
    })
  }
}

// Create a parking facility.
const createFacility = async (req, res) => {
  try {
    const facility = await Facility.create({
      ...req.body,
      createdBy: req.dbUser._id,
    })

    return res.status(201).json({
      success: true,
      message: 'Parking facility created successfully.',
      facility,
    })
  } catch (error) {
    console.error('Creating facility failed:', error.message)

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to create parking facility.',
    })
  }
}

// Update facility details and rates.
const updateFacility = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found.',
      })
    }

    const facility = await Facility.findById(req.params.id)

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found.',
      })
    }

    // Prevent capacity from becoming smaller than existing slots.
    if (req.body.totalCapacity !== undefined) {
      const newCapacity = Number(req.body.totalCapacity)

      if (!Number.isInteger(newCapacity) || newCapacity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Facility capacity must be a positive whole number.',
        })
      }

      const existingSlotCount = await Slot.countDocuments({
        facility: facility._id,
      })

      if (newCapacity < existingSlotCount) {
        return res.status(400).json({
          success: false,
          message: `Facility capacity cannot be lower than its ${existingSlotCount} existing slots.`,
        })
      }
    }

    const allowedFields = [
      'name',
      'description',
      'address',
      'city',
      'state',
      'postalCode',
      'latitude',
      'longitude',
      'contactPhone',
      'totalCapacity',
      'operatingHours',
      'amenities',
      'rates',
      'status',
    ]

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        facility[field] = req.body[field]
      }
    }

    await facility.save()

    return res.status(200).json({
      success: true,
      message: 'Parking facility updated successfully.',
      facility,
    })
  } catch (error) {
    console.error('Updating facility failed:', error.message)

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update parking facility.',
    })
  }
}

// Deactivate a facility instead of permanently deleting it.
const deactivateFacility = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found.',
      })
    }

    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'Inactive' } },
      { new: true, runValidators: true },
    )

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Facility deactivated successfully.',
      facility,
    })
  } catch (error) {
    console.error('Deactivating facility failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to deactivate facility.',
    })
  }
}

module.exports = {
  getActiveFacilities,
  getAllFacilities,
  createFacility,
  updateFacility,
  deactivateFacility,
}
