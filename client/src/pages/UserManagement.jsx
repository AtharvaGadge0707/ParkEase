import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Users,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const UserManagement = () => {
  const { currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [drafts, setDrafts] = useState({})
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadData = useCallback(
    async (searchValue = '', roleValue = 'All', isRefresh = false) => {
      if (!currentUser) return

      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setError('')
      setMessage('')

      try {
        const token = await currentUser.getIdToken()
        const params = new URLSearchParams()

        if (searchValue.trim()) params.set('search', searchValue.trim())
        if (roleValue !== 'All') params.set('role', roleValue)

        const userPath = `/api/admin/users${params.toString() ? `?${params}` : ''}`

        const [userData, facilityData] = await Promise.all([
          apiRequest(userPath, { token }),
          apiRequest('/api/facilities', { token }),
        ])

        const userList = userData.users || []
        const facilityList = facilityData.facilities || []

        setUsers(userList)
        setFacilities(facilityList)

        const initialDrafts = Object.fromEntries(
          userList.map((user) => [
            user._id,
            {
              role: user.role,
              assignedFacility: user.assignedFacility?._id || '',
            },
          ]),
        )

        setDrafts(initialDrafts)
      } catch (err) {
        setError(err.message || 'Unable to load user management data.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [currentUser],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadData])

  const updateDraft = (userId, field, value) => {
    setDrafts((previous) => ({
      ...previous,
      [userId]: {
        ...previous[userId],
        [field]: value,
      },
    }))
  }

  const handleSearch = (event) => {
    event.preventDefault()
    loadData(search, roleFilter)
  }

  const handleSave = async (userId) => {
    const draft = drafts[userId]

    if (!draft) return

    if (
      draft.role === 'Parking Staff' &&
      !draft.assignedFacility
    ) {
      setError('Please assign a facility to this Parking Staff account.')
      return
    }

    setSavingId(userId)
    setError('')
    setMessage('')

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(`/api/admin/users/${userId}`, {
        token,
        method: 'PATCH',
        body: {
          role: draft.role,
          assignedFacility:
            draft.role === 'Parking Staff'
              ? draft.assignedFacility
              : null,
        },
      })

      setMessage(data.message || 'User updated successfully.')

      await loadData(search, roleFilter, true)
    } catch (err) {
      setError(err.message || 'Unable to update user.')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600" size={30} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            User Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage registered users, roles and staff facility assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(search, roleFilter, true)}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <Users className="text-blue-600" size={22} />
          <p className="mt-3 text-sm text-slate-500">Users displayed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {users.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <ShieldCheck className="text-purple-600" size={22} />
          <p className="mt-3 text-sm text-slate-500">Administrators</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {users.filter((user) => user.role === 'Administrator').length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <Users className="text-green-600" size={22} />
          <p className="mt-3 text-sm text-slate-500">Parking Staff</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {users.filter((user) => user.role === 'Parking Staff').length}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row"
      >
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="All">All Roles</option>
          <option value="Customer">Customer</option>
          <option value="Parking Staff">Parking Staff</option>
          <option value="Administrator">Administrator</option>
        </select>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Registered Users
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Maximum 200 users are displayed per search.
          </p>
        </div>

        {users.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Current Role</th>
                  <th className="px-5 py-3">New Role</th>
                  <th className="px-5 py-3">Assigned Facility</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const draft = drafts[user._id] || {
                    role: user.role,
                    assignedFacility: user.assignedFacility?._id || '',
                  }

                  const isChanged =
                    draft.role !== user.role ||
                    draft.assignedFacility !==
                      (user.assignedFacility?._id || '')

                  return (
                    <tr key={user._id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {user.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {user.email}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {user.role}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={draft.role}
                          onChange={(event) =>
                            updateDraft(user._id, 'role', event.target.value)
                          }
                          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                        >
                          <option value="Customer">Customer</option>
                          <option value="Parking Staff">Parking Staff</option>
                          <option value="Administrator">Administrator</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        {draft.role === 'Parking Staff' ? (
                          <select
                            value={draft.assignedFacility}
                            onChange={(event) =>
                              updateDraft(
                                user._id,
                                'assignedFacility',
                                event.target.value,
                              )
                            }
                            className="max-w-52 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                          >
                            <option value="">Select facility</option>
                            {facilities
                              .filter((facility) => facility.status === 'Active')
                              .map((facility) => (
                                <option
                                  key={facility._id}
                                  value={facility._id}
                                >
                                  {facility.name} — {facility.city}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span className="text-slate-400">Not applicable</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleSave(user._id)}
                          disabled={
                            !isChanged ||
                            savingId === user._id ||
                            (draft.role === 'Parking Staff' &&
                              !draft.assignedFacility)
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save size={14} />
                          {savingId === user._id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserManagement