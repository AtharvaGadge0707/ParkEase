
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarCheck,
  MapPin,
  Clock3,
  ParkingSquare,
  CarFront,
  IndianRupee,
  XCircle,
  LogIn,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const toLocalDateTime = (date) => {
  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16)
}

const initialStart = toLocalDateTime(
  new Date(Date.now() + 60 * 60 * 1000),
)

const initialEnd = toLocalDateTime(
  new Date(Date.now() + 2 * 60 * 60 * 1000),
)

const formatDate = (value) =>
  value ? new Date(value).toLocaleString() : 'Not recorded'

export default function Bookings() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const preselectedFacility = location.state?.facilityId || ''

  const [facilities, setFacilities] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])

  const [selectedFacility, setSelectedFacility] =
    useState(preselectedFacility)
  const [selectedVehicle, setSelectedVehicle] = useState('')

  const [startTime, setStartTime] = useState(initialStart)
  const [endTime, setEndTime] = useState(initialEnd)

  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [pricing, setPricing] = useState(null)
  const [availabilityChecked, setAvailabilityChecked] =
    useState(false)

  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const currentFacility = useMemo(
    () =>
      facilities.find(
        (facility) => facility._id === selectedFacility,
      ),
    [facilities, selectedFacility],
  )

  // Only show vehicles supported by the selected facility.
  const eligibleVehicles = useMemo(() => {
    if (!currentFacility) return []

    const supportedTypes = (currentFacility.rates || []).map(
      (rate) => rate.vehicleType,
    )

    return vehicles.filter((vehicle) =>
      supportedTypes.includes(vehicle.type),
    )
  }, [currentFacility, vehicles])

  const clearAvailability = () => {
    setAvailableSlots([])
    setSelectedSlot('')
    setPricing(null)
    setAvailabilityChecked(false)
  }

  // Load facilities, customer's vehicles and booking history.
  useEffect(() => {
    let active = true

    const loadInitialData = async () => {
      try {
        const token = await currentUser.getIdToken()

        const [facilityData, vehicleData, bookingData] =
          await Promise.all([
            apiRequest('/api/facilities', { token }),
            apiRequest('/api/vehicles', { token }),
            apiRequest('/api/bookings/my', { token }),
          ])

        if (!active) return

        const facilityList = facilityData.facilities || []
        const vehicleList = vehicleData.vehicles || []

        setFacilities(facilityList)
        setVehicles(vehicleList)
        setBookings(bookingData.bookings || [])

        const initialFacility =
          facilityList.find(
            (facility) => facility._id === preselectedFacility,
          )?._id || facilityList[0]?._id || ''

        setSelectedFacility(initialFacility)

        const defaultVehicle =
          vehicleList.find((vehicle) => vehicle.isDefault) ||
          vehicleList[0]

        setSelectedVehicle(defaultVehicle?._id || '')
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadInitialData()

    return () => {
      active = false
    }
  }, [currentUser, preselectedFacility])

  // Refresh customer bookings after changes.
  const refreshBookings = useCallback(async () => {
    const token = await currentUser.getIdToken()
    const data = await apiRequest('/api/bookings/my', { token })

    setBookings(data.bookings || [])
  }, [currentUser])

  const handleFacilityChange = (event) => {
    const facilityId = event.target.value

    setSelectedFacility(facilityId)
    setSelectedVehicle('')
    clearAvailability()
    setError('')
    setSuccess('')
  }

  const handleVehicleChange = (event) => {
    setSelectedVehicle(event.target.value)
    clearAvailability()
  }

  // Check parking slot availability.
  const handleCheckAvailability = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')
    clearAvailability()

    if (!selectedFacility || !selectedVehicle) {
      setError('Please select a facility and a registered vehicle.')
      return
    }

    if (
      !startTime ||
      !endTime ||
      new Date(startTime) <= new Date() ||
      new Date(endTime) <= new Date(startTime)
    ) {
      setError(
        'Choose a future start time and an end time after the start time.',
      )
      return
    }

    setChecking(true)

    try {
      const vehicle = vehicles.find(
        (item) => item._id === selectedVehicle,
      )

      if (!vehicle) {
        throw new Error('Selected vehicle could not be found.')
      }

      const params = new URLSearchParams({
        facilityId: selectedFacility,
        vehicleType: vehicle.type,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      })

      const token = await currentUser.getIdToken()

      const data = await apiRequest(
        `/api/bookings/availability?${params.toString()}`,
        { token },
      )

      setAvailableSlots(data.availableSlots || [])
      setPricing(data.estimatedPricing || null)
      setAvailabilityChecked(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  // Create a parking reservation.
  const handleCreateBooking = async () => {
    if (!selectedSlot) {
      setError('Please select an available parking slot.')
      return
    }

    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest('/api/bookings', {
        token,
        method: 'POST',
        body: {
          facilityId: selectedFacility,
          slotId: selectedSlot,
          vehicleId: selectedVehicle,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        },
      })

      setSuccess(
        `${data.message} Booking reference: ${data.booking.bookingReference}`,
      )

      clearAvailability()
      await refreshBookings()
    } catch (err) {
      setError(err.message)
      clearAvailability()
    } finally {
      setSaving(false)
    }
  }

  // Cancel only future unpaid bookings.
  const handleCancelBooking = async (bookingId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking?',
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(
        `/api/bookings/${bookingId}/cancel`,
        {
          token,
          method: 'PATCH',
        },
      )

      setSuccess(data.message)
      await refreshBookings()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        Loading your booking information...
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
          <CalendarCheck size={26} />
        </div>

        <h2 className="text-2xl font-bold">
          My Bookings
        </h2>

        <p className="mt-2 text-sm text-blue-100">
          Reserve parking spaces, manage your bookings and view your parking history.
        </p>
      </section>

      {/* FEEDBACK */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* BOOKING FORM */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-lg font-bold text-slate-800">
          Create a Parking Reservation
        </h3>

        {facilities.length === 0 || vehicles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <CarFront
              size={36}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 font-semibold text-slate-700">
              {!facilities.length
                ? 'No active parking facilities found.'
                : 'Register a vehicle before making a booking.'}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              You need an active parking facility and a registered vehicle to make a reservation.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleCheckAvailability}
            className="space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">

              {/* FACILITY */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Parking Facility *
                </label>

                <select
                  value={selectedFacility}
                  onChange={handleFacilityChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {facilities.map((facility) => (
                    <option
                      key={facility._id}
                      value={facility._id}
                    >
                      {facility.name} — {facility.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* VEHICLE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Registered Vehicle *
                </label>

                <select
                  value={selectedVehicle}
                  onChange={handleVehicleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select a vehicle</option>

                  {eligibleVehicles.map((vehicle) => (
                    <option
                      key={vehicle._id}
                      value={vehicle._id}
                    >
                      {vehicle.registrationNumber} — {vehicle.type}
                      {vehicle.isDefault ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>

                {currentFacility && eligibleVehicles.length === 0 && (
                  <p className="mt-2 text-xs text-red-500">
                    No registered vehicle matches this facility's supported vehicle types.
                  </p>
                )}
              </div>

              {/* START TIME */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Parking Start Time *
                </label>

                <input
                  type="datetime-local"
                  value={startTime}
                  min={toLocalDateTime(new Date())}
                  onChange={(event) => {
                    setStartTime(event.target.value)
                    clearAvailability()
                  }}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* END TIME */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Parking End Time *
                </label>

                <input
                  type="datetime-local"
                  value={endTime}
                  min={startTime || toLocalDateTime(new Date())}
                  onChange={(event) => {
                    setEndTime(event.target.value)
                    clearAvailability()
                  }}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {currentFacility && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                <MapPin size={17} />
                <span>
                  {currentFacility.address}, {currentFacility.city}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={checking || eligibleVehicles.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ParkingSquare size={18} />
              {checking ? 'Checking Availability...' : 'Check Availability'}
            </button>
          </form>
        )}
      </section>

      {/* AVAILABLE SLOTS */}
      {availabilityChecked && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-800">
              Available Parking Slots
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Select one slot for your reservation.
            </p>
          </div>

          {pricing && (
            <div className="mb-5 rounded-xl bg-blue-50 p-5">
              <h4 className="font-semibold text-blue-900">
                Estimated Parking Charges
              </h4>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Rate Type</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {pricing.rateType}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Billable Units
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {pricing.billableUnits}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Estimated Total
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xl font-bold text-blue-700">
                    <IndianRupee size={19} />
                    {pricing.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {availableSlots.length === 0 ? (
            <div className="rounded-lg bg-orange-50 p-6 text-center">
              <ParkingSquare
                size={36}
                className="mx-auto text-orange-400"
              />

              <p className="mt-3 font-semibold text-slate-700">
                No slots available for this time period.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Try a different time or select another facility.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableSlots.map((slot) => {
                  const selected = selectedSlot === slot._id

                  return (
                    <button
                      key={slot._id}
                      type="button"
                      onClick={() => setSelectedSlot(slot._id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <ParkingSquare
                          size={23}
                          className={
                            selected
                              ? 'text-blue-600'
                              : 'text-slate-400'
                          }
                        />

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            selected
                              ? 'bg-blue-600 text-white'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {selected ? 'Selected' : 'Available'}
                        </span>
                      </div>

                      <h4 className="mt-4 text-lg font-bold text-slate-800">
                        {slot.slotNumber}
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        {slot.vehicleType}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {slot.floor || 'Ground Floor'}
                        {slot.section ? ` · ${slot.section}` : ''}
                      </p>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleCreateBooking}
                disabled={!selectedSlot || saving}
                className="mt-6 w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? 'Confirming Reservation...' : 'Confirm Booking'}
              </button>
            </>
          )}
        </section>
      )}

      {/* MY BOOKINGS & PARKING HISTORY */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              My Bookings & Parking History
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              View your reservations and actual parking sessions.
            </p>
          </div>

          <span className="text-sm text-slate-500">
            {bookings.length} booking(s)
          </span>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <CalendarCheck
              size={40}
              className="mx-auto text-slate-300"
            />

            <h4 className="mt-4 font-semibold text-slate-700">
              No bookings yet
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              Your reservations and parking history will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              // Only future unpaid bookings can be cancelled.
              const canCancel =
                ['Pending Payment', 'Confirmed'].includes(
                  booking.status,
                ) &&
                booking.paymentStatus !== 'Paid' &&
                new Date(booking.startTime) > new Date()

              // Pending or unpaid confirmed bookings can be paid.
              const canPay =
                ['Pending Payment', 'Confirmed'].includes(
                  booking.status,
                ) &&
                booking.paymentStatus !== 'Paid' &&
                new Date(booking.startTime) > new Date()

              const hasParkingSession =
                Boolean(booking.entryTime || booking.exitTime)

              return (
                <article
                  key={booking._id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-800">
                          {booking.facility?.name || 'Parking Facility'}
                        </h4>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            booking.status === 'Confirmed'
                              ? 'bg-green-50 text-green-700'
                              : booking.status === 'Cancelled'
                                ? 'bg-red-50 text-red-700'
                                : booking.status === 'Pending Payment'
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Reference: {booking.bookingReference}
                      </p>

                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <p className="flex items-center gap-2">
                          <ParkingSquare size={16} />
                          Slot: {booking.slot?.slotNumber || 'N/A'}
                        </p>

                        <p className="flex items-center gap-2">
                          <CarFront size={16} />
                          Vehicle:{' '}
                          {booking.vehicle?.registrationNumber || 'N/A'}
                        </p>

                        <p className="flex items-center gap-2">
                          <MapPin size={16} />
                          {booking.facility?.city || 'N/A'}
                        </p>

                        <p className="flex items-center gap-2">
                          <Clock3 size={16} />
                          Start: {formatDate(booking.startTime)}
                        </p>

                        <p className="flex items-center gap-2">
                          <Clock3 size={16} />
                          End: {formatDate(booking.endTime)}
                        </p>

                        {booking.paymentStatus && (
                          <p className="text-xs text-slate-500">
                            Payment Status: {booking.paymentStatus}
                          </p>
                        )}
                      </div>

                      {/* ACTUAL PARKING SESSION HISTORY */}
                      {hasParkingSession && (
                        <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
                          <h5 className="font-semibold text-blue-900">
                            Actual Parking Session
                          </h5>

                          <div className="mt-3 space-y-3">
                            <p className="flex items-center gap-2 text-sm text-slate-700">
                              <LogIn
                                size={17}
                                className="shrink-0 text-green-600"
                              />
                              <span>
                                <span className="font-medium">Entry:</span>{' '}
                                {formatDate(booking.entryTime)}
                              </span>
                            </p>

                            <p className="flex items-center gap-2 text-sm text-slate-700">
                              <LogOut
                                size={17}
                                className="shrink-0 text-red-600"
                              />
                              <span>
                                <span className="font-medium">Exit:</span>{' '}
                                {formatDate(booking.exitTime)}
                              </span>
                            </p>
                          </div>

                          <span
                            className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              booking.exitTime
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {booking.exitTime
                              ? 'Parking Session Completed'
                              : 'Vehicle Currently Parked'}
                          </span>
                        </div>
                      )}

                      {booking.status === 'Completed' && !hasParkingSession && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                          This booking is completed. Actual entry and exit
                          timestamps are not available.
                        </div>
                      )}
                    </div>

                    <div className="sm:min-w-44 sm:text-right">
                      <p className="text-xs text-slate-500">
                        Booking Amount
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-800">
                        <IndianRupee
                          size={19}
                          className="mr-0.5 inline"
                        />
                        {booking.totalAmount?.toFixed(2)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {booking.durationHours} hour(s)
                      </p>

                      {/* PAY NOW BUTTON */}
                      {canPay && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate('/payments', {
                              state: { bookingId: booking._id },
                            })
                          }
                          className="mt-4 block w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                          Pay Now
                        </button>
                      )}

                      {/* CANCEL BOOKING BUTTON */}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCancelBooking(booking._id)
                          }
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          <XCircle size={16} />
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
