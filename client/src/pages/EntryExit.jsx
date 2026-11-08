import { useState } from 'react'
import { Search, CarFront, CheckCircle2, Clock3 } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN') : 'Not recorded'

function EntryExit() {
  const { currentUser } = useAuth()
  const [reference, setReference] = useState('')
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const searchBooking = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    setBooking(null)

    try {
      const token = await currentUser.getIdToken()
      const data = await apiRequest(
        `/api/operations/booking/${encodeURIComponent(reference.trim())}`,
        { token },
      )
      setBooking(data.booking)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkIn = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const token = await currentUser.getIdToken()
      const data = await apiRequest('/api/operations/entry', {
        token,
        method: 'POST',
        body: { bookingReference: booking.bookingReference },
      })

      setBooking((previous) => ({
        ...previous,
        entryTime: data.booking.entryTime,
        checkedInBy: data.booking.checkedInBy,
      }))
      setMessage(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const alreadyEntered = Boolean(booking?.entryTime)
  const canEnter =
    booking?.status === 'Confirmed' &&
    booking?.paymentStatus === 'Paid' &&
    !alreadyEntered &&
    !booking?.exitTime

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-slate-800">
          Vehicle Entry / Exit
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Search a booking reference and verify vehicle entry.
        </p>
      </section>

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
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Search size={18} />
          {loading ? 'Searching...' : 'Search Booking'}
        </button>
      </form>

      {message && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {booking && (
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Booking reference
              </p>
              <h3 className="text-xl font-bold text-slate-800">
                {booking.bookingReference}
              </h3>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
              {booking.status}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <CarFront className="mb-2 text-blue-600" />
              <p className="font-semibold text-slate-800">
                {booking.vehicle?.registrationNumber || 'Vehicle'}
              </p>
              <p className="text-sm text-slate-500">
                {booking.vehicle?.make} {booking.vehicle?.model}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <Clock3 className="mb-2 text-blue-600" />
              <p className="font-semibold text-slate-800">
                {booking.slot?.slotNumber}
              </p>
              <p className="text-sm text-slate-500">
                {booking.facility?.name}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-slate-500">Customer:</span>{' '}
              <strong>{booking.user?.name}</strong>
            </p>
            <p>
              <span className="text-slate-500">Payment:</span>{' '}
              <strong>{booking.paymentStatus}</strong>
            </p>
            <p>
              <span className="text-slate-500">Start:</span>{' '}
              {formatDate(booking.startTime)}
            </p>
            <p>
              <span className="text-slate-500">End:</span>{' '}
              {formatDate(booking.endTime)}
            </p>
            <p>
              <span className="text-slate-500">Entry:</span>{' '}
              {formatDate(booking.entryTime)}
            </p>
            <p>
              <span className="text-slate-500">Exit:</span>{' '}
              {formatDate(booking.exitTime)}
            </p>
          </div>

          {canEnter ? (
            <button
              type="button"
              onClick={checkIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 size={19} />
              {loading ? 'Processing...' : 'Verify & Check In Vehicle'}
            </button>
          ) : alreadyEntered && !booking.exitTime ? (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              This vehicle is already checked in. Manage its exit from Active
              Sessions.
            </p>
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              This booking is not eligible for vehicle entry. Check its payment
              and booking status.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

export default EntryExit