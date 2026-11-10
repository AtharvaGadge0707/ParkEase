
import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  CarFront,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Building2,
  UserRound,
  CalendarClock,
  ParkingSquare,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not recorded'

const BookingCard = ({
  booking,
  loading,
  onCheckIn,
}) => {
  const canEnter =
    booking.status === 'Confirmed' &&
    booking.paymentStatus === 'Paid' &&
    !booking.entryTime &&
    !booking.exitTime &&
    new Date(booking.endTime) > new Date()

  const alreadyEntered = Boolean(booking.entryTime)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Booking Reference
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {booking.bookingReference}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {booking.facility?.name || 'Parking Facility'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              canEnter
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {canEnter ? 'Ready for Entry' : 'Awaiting Payment'}
          </span>

          <span className="text-xs text-slate-500">
            {booking.paymentStatus}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <UserRound className="shrink-0 text-blue-600" size={20} />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Customer</p>
            <p className="truncate text-sm font-semibold text-slate-800">
              {booking.user?.name || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <CarFront className="shrink-0 text-blue-600" size={20} />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Vehicle</p>
            <p className="text-sm font-semibold text-slate-800">
              {booking.vehicle?.registrationNumber || 'N/A'}
            </p>
            <p className="text-xs text-slate-500">
              {booking.vehicle?.make} {booking.vehicle?.model}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <ParkingSquare className="shrink-0 text-blue-600" size={20} />
          <div>
            <p className="text-xs text-slate-500">Parking Slot</p>
            <p className="text-sm font-semibold text-slate-800">
              {booking.slot?.slotNumber || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <Building2 className="shrink-0 text-blue-600" size={20} />
          <div>
            <p className="text-xs text-slate-500">Facility</p>
            <p className="text-sm font-semibold text-slate-800">
              {booking.facility?.city || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarClock size={15} />
            Scheduled Start
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {formatDate(booking.startTime)}
          </p>
        </div>

        <div>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 size={15} />
            Scheduled End
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {formatDate(booking.endTime)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-500">Booking Amount</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            ₹{booking.totalAmount?.toFixed(2) || '0.00'}
          </p>
        </div>

        {canEnter ? (
          <button
            type="button"
            onClick={() => onCheckIn(booking)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            {loading ? 'Processing...' : 'Verify & Check In'}
          </button>
        ) : alreadyEntered ? (
          <p className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
            Vehicle already checked in
          </p>
        ) : (
          <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Check-in unavailable until payment
          </p>
        )}
      </div>
    </article>
  )
}

function EntryExit() {
  const { currentUser } = useAuth()

  const [queue, setQueue] = useState([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [actionBookingId, setActionBookingId] = useState(null)

  const [reference, setReference] = useState('')
  const [searchedBooking, setSearchedBooking] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Fetch upcoming facility bookings automatically.
  const loadQueue = useCallback(
    async (showLoader = true) => {
      if (!currentUser) return

      if (showLoader) setQueueLoading(true)

      try {
        const token = await currentUser.getIdToken()

        const data = await apiRequest(
          '/api/operations/entry-queue',
          { token },
        )

        setQueue(data.bookings || [])
      } catch (err) {
        setError(err.message || 'Unable to load booking queue.')
      } finally {
        if (showLoader) setQueueLoading(false)
      }
    },
    [currentUser],
  )

  // Initial loading and automatic refresh every 30 seconds.
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      loadQueue()
    }, 0)

    const refreshInterval = setInterval(() => {
      loadQueue(false)
    }, 30000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(refreshInterval)
    }
  }, [loadQueue])

  // Search booking manually as a fallback.
  const searchBooking = async (event) => {
    event.preventDefault()

    setSearchLoading(true)
    setMessage('')
    setError('')
    setSearchedBooking(null)

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(
        `/api/operations/booking/${encodeURIComponent(reference.trim())}`,
        { token },
      )

      setSearchedBooking(data.booking)
    } catch (err) {
      setError(err.message)
    } finally {
      setSearchLoading(false)
    }
  }

  // Check in a vehicle using the existing secure backend endpoint.
  const checkIn = async (booking) => {
    const confirmed = window.confirm(
      `Verify vehicle ${booking.vehicle?.registrationNumber || ''} and record its entry?`,
    )

    if (!confirmed) return

    setActionBookingId(booking._id)
    setMessage('')
    setError('')

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest('/api/operations/entry', {
        token,
        method: 'POST',
        body: {
          bookingReference: booking.bookingReference,
        },
      })

      setMessage(data.message)

      // Update a manually searched booking if it matches.
      setSearchedBooking((previous) =>
        previous?._id === booking._id
          ? {
              ...previous,
              entryTime: data.booking.entryTime,
              checkedInBy: data.booking.checkedInBy,
            }
          : previous,
      )

      // Remove the checked-in booking from the upcoming queue.
      setQueue((previous) =>
        previous.filter((item) => item._id !== booking._id),
      )

      // Refresh the queue from the server.
      await loadQueue(false)
    } catch (err) {
      setError(err.message || 'Unable to check in vehicle.')
    } finally {
      setActionBookingId(null)
    }
  }

  const readyCount = queue.filter(
    (booking) =>
      booking.status === 'Confirmed' &&
      booking.paymentStatus === 'Paid' &&
      !booking.entryTime,
  ).length

  const awaitingPaymentCount = queue.length - readyCount

  const alreadyEntered = Boolean(searchedBooking?.entryTime)

  const canEnterSearched =
    searchedBooking?.status === 'Confirmed' &&
    searchedBooking?.paymentStatus === 'Paid' &&
    !alreadyEntered &&
    !searchedBooking?.exitTime &&
    new Date(searchedBooking?.endTime) > new Date()

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800">
          Vehicle Entry / Exit
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          View incoming facility bookings and verify vehicle entries.
        </p>
      </section>

      {/* FEEDBACK */}
      {message && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* BOOKING QUEUE */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              Incoming Bookings
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Bookings for your assigned facility appear here automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadQueue()}
            disabled={queueLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={queueLoading ? 'animate-spin' : ''}
            />
            Refresh Queue
          </button>
        </div>

        {/* QUEUE SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total Incoming</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {queue.length}
            </p>
          </div>

          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="text-sm text-green-700">Ready for Entry</p>
            <p className="mt-2 text-2xl font-bold text-green-800">
              {readyCount}
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">Awaiting Payment</p>
            <p className="mt-2 text-2xl font-bold text-amber-800">
              {awaitingPaymentCount}
            </p>
          </div>
        </div>

        {/* AUTOMATIC BOOKING CARDS */}
        {queueLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <RefreshCw
              className="mx-auto animate-spin text-blue-600"
              size={28}
            />
            <p className="mt-3 text-sm text-slate-500">
              Loading incoming bookings...
            </p>
          </div>
        ) : queue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <ParkingSquare
              size={40}
              className="mx-auto text-slate-300"
            />

            <h4 className="mt-4 font-semibold text-slate-700">
              No incoming bookings
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              New bookings for your facility will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                loading={actionBookingId === booking._id}
                onCheckIn={checkIn}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400">
          Booking queue refreshes automatically every 30 seconds.
        </p>
      </section>

      {/* MANUAL SEARCH FALLBACK */}
      <section className="space-y-4 border-t border-slate-200 pt-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            Manual Booking Verification
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Search using a booking reference if a booking is not visible in the queue.
          </p>
        </div>

        <form
          onSubmit={searchBooking}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row"
        >
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Enter booking reference (e.g. PE-XXXXXXXX)"
            required
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={searchLoading}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Search size={18} />
            {searchLoading ? 'Searching...' : 'Search Booking'}
          </button>
        </form>

        {/* SEARCHED BOOKING DETAILS */}
        {searchedBooking && (
          <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Booking Reference
                </p>

                <h3 className="text-xl font-bold text-slate-800">
                  {searchedBooking.bookingReference}
                </h3>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {searchedBooking.status}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4">
                <CarFront className="mb-2 text-blue-600" />
                <p className="font-semibold text-slate-800">
                  {searchedBooking.vehicle?.registrationNumber || 'Vehicle'}
                </p>
                <p className="text-sm text-slate-500">
                  {searchedBooking.vehicle?.make}{' '}
                  {searchedBooking.vehicle?.model}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <Clock3 className="mb-2 text-blue-600" />
                <p className="font-semibold text-slate-800">
                  {searchedBooking.slot?.slotNumber || 'N/A'}
                </p>
                <p className="text-sm text-slate-500">
                  {searchedBooking.facility?.name || 'N/A'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="text-slate-500">Customer:</span>{' '}
                <strong>{searchedBooking.user?.name}</strong>
              </p>

              <p>
                <span className="text-slate-500">Payment:</span>{' '}
                <strong>{searchedBooking.paymentStatus}</strong>
              </p>

              <p>
                <span className="text-slate-500">Start:</span>{' '}
                {formatDate(searchedBooking.startTime)}
              </p>

              <p>
                <span className="text-slate-500">End:</span>{' '}
                {formatDate(searchedBooking.endTime)}
              </p>

              <p>
                <span className="text-slate-500">Entry:</span>{' '}
                {formatDate(searchedBooking.entryTime)}
              </p>

              <p>
                <span className="text-slate-500">Exit:</span>{' '}
                {formatDate(searchedBooking.exitTime)}
              </p>
            </div>

            {canEnterSearched ? (
              <button
                type="button"
                onClick={() => checkIn(searchedBooking)}
                disabled={actionBookingId === searchedBooking._id}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle2 size={19} />
                {actionBookingId === searchedBooking._id
                  ? 'Processing...'
                  : 'Verify & Check In Vehicle'}
              </button>
            ) : alreadyEntered && !searchedBooking.exitTime ? (
              <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                This vehicle is already checked in. Manage its exit from Active Sessions.
              </p>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                This booking is not eligible for vehicle entry. Check its payment and booking status.
              </p>
            )}
          </section>
        )}
      </section>
    </div>
  )
}

export default EntryExit
