import { useCallback, useEffect, useState } from 'react'
import { CarFront, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const initialForm = {
  registrationNumber: '',
  type: 'Car',
  make: '',
  model: '',
  color: '',
  nickname: '',
  isDefault: false,
}

export default function Vehicles() {
  const { currentUser } = useAuth()

  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadVehicles = useCallback(async () => {
    try {
      const token = await currentUser.getIdToken()
      const data = await apiRequest('/api/vehicles', { token })
      setVehicles(data.vehicles || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
  let active = true

  currentUser
    .getIdToken()
    .then((token) => apiRequest('/api/vehicles', { token }))
    .then((data) => {
      if (active) {
        setVehicles(data.vehicles || [])
        setError('')
      }
    })
    .catch((err) => {
      if (active) {
        setError(err.message)
      }
    })
    .finally(() => {
      if (active) {
        setLoading(false)
      }
    })

  return () => {
    active = false
  }
}, [currentUser])
  const handleChange = (event) => {
    const { name, value, checked, type } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const token = await currentUser.getIdToken()

      const body = {
        ...form,
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
      }

      const data = await apiRequest(
        editingId
          ? `/api/vehicles/${editingId}`
          : '/api/vehicles',
        {
          token,
          method: editingId ? 'PUT' : 'POST',
          body,
        },
      )

      setSuccess(data.message)
      resetForm()
      await loadVehicles()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (vehicle) => {
    setEditingId(vehicle._id)
    setForm({
      registrationNumber: vehicle.registrationNumber || '',
      type: vehicle.type || 'Car',
      make: vehicle.make || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      nickname: vehicle.nickname || '',
      isDefault: Boolean(vehicle.isDefault),
    })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (vehicleId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this vehicle?',
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(`/api/vehicles/${vehicleId}`, {
        token,
        method: 'DELETE',
      })

      setSuccess(data.message)
      await loadVehicles()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <CarFront size={26} />
          </div>
          <h2 className="text-2xl font-bold">My Vehicles</h2>
          <p className="mt-1 text-sm text-blue-100">
            Manage your registered vehicles for parking reservations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm(true)
            setError('')
            setSuccess('')
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          <Plus size={18} />
          Add Vehicle
        </button>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              {editingId ? 'Edit Vehicle' : 'Register New Vehicle'}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close vehicle form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Registration Number *
                </label>
                <input
                  name="registrationNumber"
                  value={form.registrationNumber}
                  onChange={handleChange}
                  placeholder="e.g. MH12AB1234"
                  minLength={4}
                  maxLength={15}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Vehicle Type *
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="Car">Car</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="SUV">SUV</option>
                  <option value="Van">Van</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Vehicle Make
                </label>
                <input
                  name="make"
                  value={form.make}
                  onChange={handleChange}
                  placeholder="e.g. Hyundai"
                  maxLength={40}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Vehicle Model
                </label>
                <input
                  name="model"
                  value={form.model}
                  onChange={handleChange}
                  placeholder="e.g. Creta"
                  maxLength={40}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Color
                </label>
                <input
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="e.g. White"
                  maxLength={25}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nickname
                </label>
                <input
                  name="nickname"
                  value={form.nickname}
                  onChange={handleChange}
                  placeholder="e.g. My Daily Car"
                  maxLength={30}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isDefault"
                checked={form.isDefault}
                onChange={handleChange}
                className="h-4 w-4 accent-blue-600"
              />
              Set as my default vehicle
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Vehicle'
                    : 'Save Vehicle'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            Registered Vehicles
          </h3>
          <span className="text-sm text-slate-500">
            {vehicles.length} vehicle(s)
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading vehicles...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <CarFront size={40} className="mx-auto text-slate-300" />
            <h4 className="mt-4 font-semibold text-slate-700">
              No vehicles registered yet
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              Add your first vehicle to manage your parking reservations.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((vehicle) => (
              <article
                key={vehicle._id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CarFront size={23} />
                  </div>

                  {vehicle.isDefault && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Default
                    </span>
                  )}
                </div>

                <h4 className="mt-4 text-lg font-bold text-slate-800">
                  {vehicle.registrationNumber}
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  {[vehicle.make, vehicle.model]
                    .filter(Boolean)
                    .join(' ') || vehicle.type}
                </p>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>Type: {vehicle.type}</p>
                  {vehicle.color && <p>Color: {vehicle.color}</p>}
                  {vehicle.nickname && (
                    <p>Nickname: {vehicle.nickname}</p>
                  )}
                </div>

                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(vehicle)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(vehicle._id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}