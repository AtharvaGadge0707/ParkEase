import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  Building2,
  CarFront,
  CheckCircle2,
  Clock3,
  ParkingSquare,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const StatCard = ({ title, value, description, icon: Icon }) => (
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

const StaffDashboard = () => {
  const { currentUser, userProfile } = useAuth()

  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (!currentUser) return

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      try {
        const token = await currentUser.getIdToken()

        const data = await apiRequest('/api/operations/dashboard', {
          token,
        })

        setDashboard(data)
        setLastUpdated(new Date())
      } catch (err) {
        setError(err.message || 'Unable to load dashboard.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [currentUser],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadDashboard])

  const summary = dashboard?.summary

  const statCards = summary
    ? [
        {
          title: 'Total Facilities',
          value: summary.totalFacilities,
          description: 'Facilities in your overview',
          icon: Building2,
        },
        {
          title: 'Total Parking Slots',
          value: summary.totalSlots,
          description: `Capacity: ${summary.totalCapacity}`,
          icon: ParkingSquare,
        },
        {
          title: 'Available Slots',
          value: summary.availableSlots,
          description: 'Ready for parking',
          icon: CheckCircle2,
        },
        {
          title: 'Reserved Slots',
          value: summary.reservedSlots,
          description: 'Currently reserved',
          icon: Clock3,
        },
        {
          title: 'Occupied Slots',
          value: summary.occupiedSlots,
          description: 'Currently occupied',
          icon: CarFront,
        },
        {
          title: 'Unavailable Slots',
          value: summary.unavailableSlots,
          description: 'Not available for parking',
          icon: Ban,
        },
        {
          title: 'Active Vehicles',
          value: summary.activeVehicles,
          description: 'Vehicles currently inside',
          icon: Activity,
        },
        {
          title: "Today's Entries",
          value: summary.todayEntries,
          description: 'Vehicles checked in today',
          icon: ArrowDownToLine,
        },
        {
          title: "Today's Exits",
          value: summary.todayExits,
          description: 'Vehicles checked out today',
          icon: ArrowUpFromLine,
        },
      ]
    : []

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto animate-spin text-blue-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">
            Loading facility operations...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Staff Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {userProfile?.role === 'Administrator'
              ? 'Overall parking facility operations overview.'
              : 'Monitor operations at your assigned parking facility.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {dashboard && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm font-medium text-blue-900">
              Operations overview · {dashboard.date}
            </p>

            {lastUpdated && (
              <p className="text-xs text-blue-700">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Operations Summary
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {statCards.map((card) => (
                <StatCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Facility Overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Slot availability and vehicle activity by facility.
              </p>
            </div>

            {dashboard.facilities?.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {dashboard.facilities.map((facility) => (
                  <div
                    key={facility._id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {facility.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {facility.city}, {facility.state}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          facility.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {facility.status}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Total Slots</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">
                          {facility.slots.total}
                        </p>
                      </div>

                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs text-green-700">Available</p>
                        <p className="mt-1 text-xl font-bold text-green-800">
                          {facility.slots.available}
                        </p>
                      </div>

                      <div className="rounded-lg bg-amber-50 p-3">
                        <p className="text-xs text-amber-700">Reserved</p>
                        <p className="mt-1 text-xl font-bold text-amber-800">
                          {facility.slots.reserved}
                        </p>
                      </div>

                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-xs text-blue-700">Occupied</p>
                        <p className="mt-1 text-xl font-bold text-blue-800">
                          {facility.slots.occupied}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-500">
                          Active Vehicles
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {facility.activeVehicles}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Today's Entries
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {facility.todayEntries}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Today's Exits
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {facility.todayExits}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <Building2
                  className="mx-auto text-slate-400"
                  size={32}
                />
                <p className="mt-3 font-medium text-slate-700">
                  No facilities found.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Assign a facility to this staff account or add a facility as
                  an administrator.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default StaffDashboard