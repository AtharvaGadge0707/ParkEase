import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  Building2,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const MetricCard = ({ title, value, description, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
        <Icon size={20} />
      </div>
    </div>

    <p className="mt-3 text-2xl font-bold text-slate-900">
      {value}
    </p>

    <p className="mt-1 text-xs text-slate-500">{description}</p>
  </div>
)

const TrendChart = ({ title, data, valueKey, formatValue }) => {
  const maxValue = Math.max(
    1,
    ...data.map((item) => item[valueKey] || 0),
  )

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">{title}</h2>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">
          No trend data available.
        </p>
      ) : (
        <>
          <div className="mt-6 flex h-48 items-end gap-2 border-b border-slate-200 pb-2 sm:gap-4">
            {data.map((item) => {
              const value = item[valueKey] || 0
              const height =
                value === 0 ? 3 : Math.max(6, (value / maxValue) * 100)

              return (
                <div
                  key={item.date}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="max-w-full truncate text-center text-[10px] text-slate-600 sm:text-xs">
                    {formatValue(value)}
                  </span>

                  <div
                    className="w-full rounded-t-md bg-blue-500 transition-all hover:bg-blue-700"
                    style={{ height: `${height}%` }}
                    title={`${item.date}: ${formatValue(value)}`}
                  />

                  <span className="text-[10px] text-slate-500 sm:text-xs">
                    {new Date(`${item.date}T00:00:00+05:30`).toLocaleDateString(
                      'en-IN',
                      {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'Asia/Kolkata',
                      },
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Last seven days, including today.
          </p>
        </>
      )}
    </section>
  )
}

const Reports = () => {
  const { currentUser } = useAuth()

  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadReports = useCallback(
    async (isRefresh = false) => {
      if (!currentUser) return

      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setError('')

      try {
        const token = await currentUser.getIdToken()
        const data = await apiRequest('/api/admin/reports', { token })

        setReports(data)
        setLastUpdated(new Date())
      } catch (err) {
        setError(err.message || 'Unable to load reports.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [currentUser],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadReports])

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600" size={30} />
      </div>
    )
  }

  const summary = reports?.summary
  const statuses = reports?.bookingStatuses
  const facilities = reports?.facilityPerformance || []
  const trends = reports?.dailyTrends || []
  const paymentMethods = reports?.paymentMethods || []

  const bookingTotal = statuses
    ? Object.values(statuses).reduce((total, value) => total + value, 0)
    : 0

  const statusItems = [
    {
      label: 'Pending Payment',
      value: statuses?.pendingPayment || 0,
      color: 'bg-amber-500',
    },
    {
      label: 'Confirmed',
      value: statuses?.confirmed || 0,
      color: 'bg-blue-500',
    },
    {
      label: 'Completed',
      value: statuses?.completed || 0,
      color: 'bg-green-500',
    },
    {
      label: 'Cancelled',
      value: statuses?.cancelled || 0,
      color: 'bg-red-500',
    },
  ]

  const metricCards = [
    {
      title: 'Total Bookings',
      value: summary?.totalBookings || 0,
      description: 'All recorded bookings',
      icon: ClipboardList,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(summary?.totalRevenue),
      description: 'Successful payments only',
      icon: IndianRupee,
    },
    {
      title: 'Successful Payments',
      value: summary?.successfulPayments || 0,
      description: 'Completed payment transactions',
      icon: CheckCircle2,
    },
    {
      title: 'Failed Payments',
      value: summary?.failedPayments || 0,
      description: 'Unsuccessful payment attempts',
      icon: XCircle,
    },
    {
      title: 'Total Facilities',
      value: summary?.totalFacilities || 0,
      description: 'Registered parking facilities',
      icon: Building2,
    },
    {
      title: 'Pending Bookings',
      value: summary?.pendingBookings || 0,
      description: 'Awaiting payment',
      icon: Clock3,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review booking activity, revenue and facility performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadReports(true)}
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
        <div className="flex flex-wrap justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
          <span className="font-medium text-blue-900">
            Reporting period: {reports?.period?.start} to {reports?.period?.end}
          </span>
          <span className="text-xs text-blue-700">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {reports && (
        <>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Key Performance Indicators
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metricCards.map((card) => (
                <MetricCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Booking & Revenue Trends
            </h2>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <TrendChart
                title="Daily Bookings"
                data={trends}
                valueKey="bookings"
                formatValue={(value) => value}
              />

              <TrendChart
                title="Daily Revenue"
                data={trends}
                valueKey="revenue"
                formatValue={formatCurrency}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Booking & Payment Analysis
            </h2>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-600" />
                  <h3 className="font-semibold text-slate-900">
                    Booking Status Distribution
                  </h3>
                </div>

                <div className="mt-5 space-y-5">
                  {statusItems.map((item) => {
                    const percentage =
                      bookingTotal > 0
                        ? (item.value / bookingTotal) * 100
                        : 0

                    return (
                      <div key={item.label}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="text-slate-600">
                            {item.label}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {item.value} ({percentage.toFixed(1)}%)
                          </span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CreditCard size={20} className="text-blue-600" />
                  <h3 className="font-semibold text-slate-900">
                    Revenue by Payment Method
                  </h3>
                </div>

                {paymentMethods.length > 0 ? (
                  <div className="mt-5 space-y-4">
                    {paymentMethods.map((item) => (
                      <div
                        key={item.method}
                        className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.method}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.count} successful transactions
                          </p>
                        </div>

                        <p className="font-semibold text-green-700">
                          {formatCurrency(item.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No successful payments recorded yet.
                  </p>
                )}

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Total successful revenue
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {formatCurrency(summary?.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <TrendingUp size={20} className="text-blue-600" />
              <div>
                <h2 className="font-semibold text-slate-900">
                  Facility Performance
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  All-time booking and revenue statistics by facility.
                </p>
              </div>
            </div>

            {facilities.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                No facilities found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Facility</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Bookings</th>
                      <th className="px-5 py-3">Completed</th>
                      <th className="px-5 py-3">Revenue</th>
                      <th className="px-5 py-3">Total Slots</th>
                      <th className="px-5 py-3">Occupied</th>
                      <th className="px-5 py-3">Available</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {facilities.map((facility) => (
                      <tr key={facility._id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {facility.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {facility.city}, {facility.state}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              facility.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {facility.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {facility.bookings.total}
                        </td>

                        <td className="px-5 py-4">
                          {facility.bookings.completed}
                        </td>

                        <td className="px-5 py-4 font-medium text-green-700">
                          {formatCurrency(facility.revenue)}
                        </td>

                        <td className="px-5 py-4">
                          {facility.slots.total}
                        </td>

                        <td className="px-5 py-4">
                          {facility.slots.occupied}
                        </td>

                        <td className="px-5 py-4">
                          {facility.slots.available}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center gap-3">
              <CarFront className="text-blue-600" size={24} />
              <div>
                <h2 className="font-semibold text-blue-950">
                  Reporting Summary
                </h2>
                <p className="mt-1 text-sm text-blue-800">
                  {summary?.totalBookings || 0} bookings and{' '}
                  {summary?.successfulPayments || 0} successful payment
                  transactions across {summary?.totalFacilities || 0}{' '}
                  facilities.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default Reports