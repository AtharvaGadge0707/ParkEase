const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Facility = require('../models/Facility')
const Slot = require('../models/Slot')

const getIndiaDate = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )

  return `${values.year}-${values.month}-${values.day}`
}

// Generate reports for administrators.
const getReports = async (req, res) => {
  try {
    const now = new Date()
    const today = getIndiaDate(now)

    // Start of the seven-day reporting period in Indian time.
    const firstDay = new Date(`${today}T00:00:00Z`)
    firstDay.setUTCDate(firstDay.getUTCDate() - 6)

    const firstDayString = firstDay.toISOString().slice(0, 10)
    const startOfRange = new Date(`${firstDayString}T00:00:00+05:30`)

    const dateKeys = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(firstDay)
      date.setUTCDate(date.getUTCDate() + index)
      return date.toISOString().slice(0, 10)
    })

    const [
      bookingStatusRows,
      paymentSummaryRows,
      paymentMethodRows,
      bookingTrendRows,
      revenueTrendRows,
      bookingFacilityRows,
      revenueFacilityRows,
      slotFacilityRows,
      facilities,
    ] = await Promise.all([
      // Booking status distribution.
      Booking.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Payment summary and successful revenue.
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            successfulPayments: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Success'] }, 1, 0],
              },
            },
            failedPayments: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0],
              },
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Success'] },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Revenue and successful payment count by method.
      Payment.aggregate([
        {
          $match: { status: 'Success' },
        },
        {
          $group: {
            _id: '$method',
            count: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
        {
          $sort: { revenue: -1 },
        },
      ]),

      // Number of bookings created per day.
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfRange, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Kolkata',
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // Successful payment revenue per day.
      Payment.aggregate([
        {
          $match: {
            status: 'Success',
            paidAt: { $gte: startOfRange, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$paidAt',
                timezone: 'Asia/Kolkata',
              },
            },
            revenue: { $sum: '$amount' },
          },
        },
      ]),

      // Booking performance by facility.
      Booking.aggregate([
        {
          $group: {
            _id: '$facility',
            totalBookings: { $sum: 1 },
            pendingPayment: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Pending Payment'] }, 1, 0],
              },
            },
            confirmed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Successful revenue by facility.
      Payment.aggregate([
        {
          $match: { status: 'Success' },
        },
        {
          $lookup: {
            from: 'bookings',
            localField: 'booking',
            foreignField: '_id',
            as: 'bookingInfo',
          },
        },
        {
          $unwind: '$bookingInfo',
        },
        {
          $group: {
            _id: '$bookingInfo.facility',
            revenue: { $sum: '$amount' },
            successfulPayments: { $sum: 1 },
          },
        },
      ]),

      // Slot distribution by facility.
      Slot.aggregate([
        {
          $group: {
            _id: '$facility',
            total: { $sum: 1 },
            available: {
              $sum: { $cond: [{ $eq: ['$status', 'Available'] }, 1, 0] },
            },
            reserved: {
              $sum: { $cond: [{ $eq: ['$status', 'Reserved'] }, 1, 0] },
            },
            occupied: {
              $sum: { $cond: [{ $eq: ['$status', 'Occupied'] }, 1, 0] },
            },
            unavailable: {
              $sum: { $cond: [{ $eq: ['$status', 'Unavailable'] }, 1, 0] },
            },
          },
        },
      ]),

      Facility.find()
        .select('name city state status totalCapacity')
        .sort({ name: 1 })
        .lean(),
    ])

    const bookingStatusMap = Object.fromEntries(
      bookingStatusRows.map((item) => [item._id, item.count]),
    )

    const paymentSummary = paymentSummaryRows[0] || {
      totalAttempts: 0,
      successfulPayments: 0,
      failedPayments: 0,
      totalRevenue: 0,
    }

    const bookingTrendMap = new Map(
      bookingTrendRows.map((item) => [item._id, item.count]),
    )

    const revenueTrendMap = new Map(
      revenueTrendRows.map((item) => [item._id, item.revenue]),
    )

    const bookingFacilityMap = new Map(
      bookingFacilityRows.map((item) => [item._id.toString(), item]),
    )

    const revenueFacilityMap = new Map(
      revenueFacilityRows.map((item) => [item._id.toString(), item]),
    )

    const slotFacilityMap = new Map(
      slotFacilityRows.map((item) => [item._id.toString(), item]),
    )

    const dailyTrends = dateKeys.map((date) => ({
      date,
      bookings: bookingTrendMap.get(date) || 0,
      revenue: revenueTrendMap.get(date) || 0,
    }))

    const facilityPerformance = facilities.map((facility) => {
      const id = facility._id.toString()
      const bookingData = bookingFacilityMap.get(id) || {}
      const revenueData = revenueFacilityMap.get(id) || {}
      const slotData = slotFacilityMap.get(id) || {}

      return {
        _id: facility._id,
        name: facility.name,
        city: facility.city,
        state: facility.state,
        status: facility.status,
        totalCapacity: facility.totalCapacity,
        bookings: {
          total: bookingData.totalBookings || 0,
          pendingPayment: bookingData.pendingPayment || 0,
          confirmed: bookingData.confirmed || 0,
          completed: bookingData.completed || 0,
          cancelled: bookingData.cancelled || 0,
        },
        revenue: revenueData.revenue || 0,
        successfulPayments: revenueData.successfulPayments || 0,
        slots: {
          total: slotData.total || 0,
          available: slotData.available || 0,
          reserved: slotData.reserved || 0,
          occupied: slotData.occupied || 0,
          unavailable: slotData.unavailable || 0,
        },
      }
    })

    return res.status(200).json({
      success: true,
      generatedAt: now,
      period: {
        start: firstDayString,
        end: today,
      },
      summary: {
        totalBookings: Object.values(bookingStatusMap).reduce(
          (total, count) => total + count,
          0,
        ),
        pendingBookings: bookingStatusMap['Pending Payment'] || 0,
        confirmedBookings: bookingStatusMap.Confirmed || 0,
        completedBookings: bookingStatusMap.Completed || 0,
        cancelledBookings: bookingStatusMap.Cancelled || 0,
        totalRevenue: paymentSummary.totalRevenue,
        totalPaymentAttempts: paymentSummary.totalAttempts,
        successfulPayments: paymentSummary.successfulPayments,
        failedPayments: paymentSummary.failedPayments,
        totalFacilities: facilities.length,
      },
      bookingStatuses: {
        pendingPayment: bookingStatusMap['Pending Payment'] || 0,
        confirmed: bookingStatusMap.Confirmed || 0,
        completed: bookingStatusMap.Completed || 0,
        cancelled: bookingStatusMap.Cancelled || 0,
      },
      paymentMethods: paymentMethodRows.map((item) => ({
        method: item._id,
        count: item.count,
        revenue: item.revenue,
      })),
      dailyTrends,
      facilityPerformance,
    })
  } catch (error) {
    console.error('Generating reports failed:', error.message)

    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate reports.',
    })
  }
}

module.exports = { getReports }