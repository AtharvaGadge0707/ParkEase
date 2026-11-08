import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, CarFront, LogOut } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN') : '—'

function ActiveSessions() {
  const { currentUser } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const token = await currentUser.getIdToken()
      const data = await apiRequest('/api/operations/sessions', { token })
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSessions()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadSessions])

  const checkOut = async (bookingId) => {
    if (!window.confirm('Confirm vehicle exit and release this parking slot?')) {
      return
    }

    setProcessingId(bookingId)
    setError('')
    setMessage('')

    try {
      const token = await currentUser.getIdToken()
      const data = await apiRequest(
        `/api/operations/${bookingId}/exit`,
        { token, method: 'POST' },
      )

      setMessage(data.message)
      await loadSessions()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessingId('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Active Parking Sessions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor checked-in vehicles and record their exit.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSessions}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Currently parked vehicles</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            {sessions.length}
          </p>
        </div>
      </div>

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

      {loading ? (
        <p className="py-8 text-center text-slate-500">
          Loading active sessions...
        </p>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <CarFront size={38} className="mx-auto text-slate-300" />
          <h3 className="mt-3 font-semibold text-slate-700">
            No active parking sessions
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Checked-in vehicles will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((session) => (
            <article
              key={session._id}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {session.bookingReference}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-800">
                    {session.vehicle?.registrationNumber}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {session.vehicle?.make} {session.vehicle?.model}
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Customer</p>
                  <p className="font-semibold text-slate-800">
                    {session.user?.name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Parking slot</p>
                  <p className="font-semibold text-slate-800">
                    {session.slot?.slotNumber}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Facility</p>
                  <p className="font-semibold text-slate-800">
                    {session.facility?.name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Entry time</p>
                  <p className="font-semibold text-slate-800">
                    {formatDate(session.entryTime)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => checkOut(session._id)}
                disabled={processingId === session._id}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <LogOut size={17} />
                {processingId === session._id
                  ? 'Processing...'
                  : 'Check Out Vehicle'}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActiveSessions