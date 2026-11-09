import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  Building2,
  ParkingSquare,
  ClipboardList,
  CarFront,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const StatCard = ({ title, value, icon: Icon, description }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
        <Icon size={20} />
      </div>
    </div>

    <p className="mt-3 text-3xl font-bold text-slate-900">
      {value ?? 0}
    </p>

    <p className="mt-1 text-xs text-slate-500">{description}</p>
  </div>
)

const BreakdownCard = ({ title, items }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 font-semibold text-slate-900">{title}</h2>

    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-3"
        >
          <span className="text-sm text-slate-600">{item.label}</span>
          <span className="font-semibold text-slate-900">
            {item.value ?? 0}
          </span>
        </div>
      ))}
    </div>
  </section>
)

const Administration = () => {
  const { currentUser } = useAuth()

  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadOverview = useCallback(
    async (isRefresh = false) => {
      if (!currentUser) return

      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setError('')

      try {
        const token = await currentUser.getIdToken()
        const data = await apiRequest('/api/admin/overview', { token })

        setOverview(data.overview)
        setLastUpdated(new Date())
      } catch (err) {
        setError(err.message || 'Unable to load administration overview.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [currentUser],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOverview()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadOverview])

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600" size={30} />
      </div>
    )
  }

  const users = overview?.users
  const facilities = overview?.facilities
  const slots = overview?.slots
  const bookings = overview?.bookings

  const mainCards = [
    {
      title: 'Total Users',
      value: users?.total,
      description: 'Registered platform users',
      icon: Users,
    },
    {
      title: 'Total Facilities',
      value: facilities?.total,
      description: `${facilities?.active ?? 0} active facilities`,
      icon: Building2,
    },
    {
      title: 'Total Parking Slots',
      value: slots?.total,
      description: `${slots?.available ?? 0} currently available`,
      icon: ParkingSquare,
    },
    {
      title: 'Total Bookings',
      value: bookings?.total,
      description: `${bookings?.confirmed ?? 0} confirmed bookings`,
      icon: ClipboardList,
    },
    {
      title: 'Active Sessions',
      value: bookings?.activeSessions,
      description: 'Vehicles currently parked',
      icon: CarFront,
    },
    {
      title: 'Completed Bookings',
      value: bookings?.completed,
      description: 'Successfully completed',
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Administration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            System-wide overview and management controls.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadOverview(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {lastUpdated && (
        <p className="text-right text-xs text-slate-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {overview && (
        <>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              System Overview
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mainCards.map((card) => (
                <StatCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Detailed Statistics
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <BreakdownCard
                title="User Distribution"
                items={[
                  { label: 'Customers', value: users.customers },
                  { label: 'Parking Staff', value: users.parkingStaff },
                  { label: 'Administrators', value: users.administrators },
                  { label: 'Total Users', value: users.total },
                ]}
              />

              <BreakdownCard
                title="Facility Status"
                items={[
                  { label: 'Active', value: facilities.active },
                  { label: 'Inactive', value: facilities.inactive },
                  { label: 'Total Facilities', value: facilities.total },
                ]}
              />

              <BreakdownCard
                title="Slot Distribution"
                items={[
                  { label: 'Available', value: slots.available },
                  { label: 'Reserved', value: slots.reserved },
                  { label: 'Occupied', value: slots.occupied },
                  { label: 'Unavailable', value: slots.unavailable },
                  { label: 'Total Slots', value: slots.total },
                ]}
              />

              <BreakdownCard
                title="Booking Status"
                items={[
                  { label: 'Pending Payment', value: bookings.pendingPayment },
                  { label: 'Confirmed', value: bookings.confirmed },
                  { label: 'Completed', value: bookings.completed },
                  { label: 'Cancelled', value: bookings.cancelled },
                  { label: 'Active Sessions', value: bookings.activeSessions },
                ]}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Administration Controls
                </h2>
                <p className="text-sm text-slate-500">
                  Manage users and parking facility information.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/users"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Manage Users
              </Link>

              <Link
                to="/facilities"
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Manage Facilities
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default Administration