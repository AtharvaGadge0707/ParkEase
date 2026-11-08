
const mongoose = require('mongoose')

const rateSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      required: true,
      enum: ['Car', 'Motorcycle', 'SUV', 'Van', 'Other'],
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
)

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
      default: '',
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20,
    },
    totalCapacity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be a whole number.',
      },
    },
    operatingHours: {
      open: {
        type: String,
        default: '06:00',
      },
      close: {
        type: String,
        default: '23:00',
      },
      is24Hours: {
        type: Boolean,
        default: false,
      },
    },
    amenities: {
      type: [String],
      default: [],
    },
    rates: {
      type: [rateSchema],
      validate: {
        validator: (rates) => {
          if (!rates || rates.length === 0) return false

          const types = rates.map((rate) => rate.vehicleType)
          return new Set(types).size === types.length
        },
        message: 'At least one rate is required, with no duplicate vehicle types.',
      },
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

facilitySchema.index({ status: 1, city: 1 })

module.exports = mongoose.model('Facility', facilitySchema)
