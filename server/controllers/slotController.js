
const mongoose = require('mongoose')
const Slot = require('../models/Slot')
const Facility = require('../models/Facility')

// Get slots belonging to a facility.
const getFacilitySlots = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.facilityId)) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found.',
      })
    }

    const facility = await Facility.findOne({
      _id: req.params.facilityId,
      status: 'Active',
    })

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Active facility not found.',
      })
    }

    const filter = { facility: facility._id }

    // Customers can only see available slots.
    if (req.dbUser.role === 'Customer') {
      filter.status = 'Available'
    }

    const slots = await Slot.find(filter)
      .sort({ slotNumber: 1 })

    return res.status(200).json({
      success: true,
      facility: {
        id: facility._id,
        name: facility.name,
        totalCapacity: facility.totalCapacity,
      },
      count: slots.length,
      slots,
    })
  } catch (error) {
    console.error('Fetching slots failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch parking slots.',
    })
  }
}

// Create a new slot. Administrator only.
const createSlot = async (req, res) => {
  try {
    const {
      facilityId,
      slotNumber,
      vehicleType,
      floor = 'Ground Floor',
      section = '',
    } = req.body

    if (
      !mongoose.isValidObjectId(facilityId) ||
      typeof slotNumber !== 'string' ||
      typeof vehicleType !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid facility, slot number and vehicle type are required.',
      })
    }

    const facility = await Facility.findOne({
      _id: facilityId,
      status: 'Active',
    })

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Active facility not found.',
      })
    }

    const supportedType = facility.rates.some(
      (rate) => rate.vehicleType === vehicleType,
    )

    if (!supportedType) {
      return res.status(400).json({
        success: false,
        message: 'This vehicle type is not supported by the facility rates.',
      })
    }

    const existingCount = await Slot.countDocuments({
      facility: facility._id,
    })

    if (existingCount >= facility.totalCapacity) {
      return res.status(409).json({
        success: false,
        message: 'Facility capacity has been reached.',
      })
    }

    const slot = await Slot.create({
      facility: facility._id,
      slotNumber: slotNumber.trim().toUpperCase(),
      vehicleType,
      floor,
      section,
      status: 'Available',
      createdBy: req.dbUser._id,
    })

    return res.status(201).json({
      success: true,
      message: 'Parking slot created successfully.',
      slot,
    })
  } catch (error) {
    console.error('Creating slot failed:', error.message)

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This slot number already exists in the selected facility.',
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
      message: 'Unable to create parking slot.',
    })
  }
}

// Edit slot details. Administrator only.
const updateSlot = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found.',
      })
    }

    const slot = await Slot.findById(req.params.id)

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found.',
      })
    }

    if (['Reserved', 'Occupied'].includes(slot.status)) {
      return res.status(409).json({
        success: false,
        message: 'Reserved or occupied slots cannot be edited.',
      })
    }

    const allowedFields = [
      'slotNumber',
      'vehicleType',
      'floor',
      'section',
    ]

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        slot[field] =
          field === 'slotNumber' && typeof req.body[field] === 'string'
            ? req.body[field].trim().toUpperCase()
            : req.body[field]
      }
    }

    if (req.body.vehicleType !== undefined) {
      const facility = await Facility.findById(slot.facility)

      const supported = facility?.rates.some(
        (rate) => rate.vehicleType === slot.vehicleType,
      )

      if (!supported) {
        return res.status(400).json({
          success: false,
          message: 'This vehicle type is not supported by the facility.',
        })
      }
    }

    await slot.save()

    return res.status(200).json({
      success: true,
      message: 'Parking slot updated successfully.',
      slot,
    })
  } catch (error) {
    console.error('Updating slot failed:', error.message)

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This slot number already exists in the facility.',
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
      message: 'Unable to update parking slot.',
    })
  }
}

// Update operational status. Parking Staff and Administrators.
const updateSlotStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found.',
      })
    }

    const { status } = req.body
    const allowedStatuses = ['Available', 'Occupied', 'Unavailable']

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Reserved status is managed by the booking system.',
      })
    }

    const slot = await Slot.findById(req.params.id)

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found.',
      })
    }

    if (slot.status === 'Reserved') {
      return res.status(409).json({
        success: false,
        message: 'Reserved slots cannot be manually updated.',
      })
    }

    slot.status = status
    await slot.save()

    return res.status(200).json({
      success: true,
      message: `Slot status changed to ${status}.`,
      slot,
    })
  } catch (error) {
    console.error('Updating slot status failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to update slot status.',
    })
  }
}

// Soft-delete a slot by marking it unavailable. Administrator only.
const deactivateSlot = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found.',
      })
    }

    const slot = await Slot.findById(req.params.id)

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found.',
      })
    }

    if (['Reserved', 'Occupied'].includes(slot.status)) {
      return res.status(409).json({
        success: false,
        message: 'Reserved or occupied slots cannot be deactivated.',
      })
    }

    slot.status = 'Unavailable'
    await slot.save()

    return res.status(200).json({
      success: true,
      message: 'Parking slot marked unavailable.',
      slot,
    })
  } catch (error) {
    console.error('Deactivating slot failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to deactivate parking slot.',
    })
  }
}

module.exports = {
  getFacilitySlots,
  createSlot,
  updateSlot,
  updateSlotStatus,
  deactivateSlot,
}
