
import { useEffect, useState } from 'react'
import {
  Building2,
  MapPin,
  Clock3,
  Phone,
  Plus,
  Pencil,
  Power,
  X,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const VEHICLE_TYPES = [
  'Car',
  'Motorcycle',
  'SUV',
  'Van',
  'Other',
]

const createEmptyForm = () => ({
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  contactPhone: '',
  totalCapacity: '',
  open: '06:00',
  close: '23:00',
  is24Hours: false,
  amenities: '',
  status: 'Active',
  rates: VEHICLE_TYPES.map((vehicleType) => ({
    vehicleType,
    hourlyRate: '',
    dailyRate: '',
  })),
})

const fetchFacilities = (token, isAdmin) =>
  apiRequest(
    isAdmin ? '/api/facilities/manage' : '/api/facilities',
    { token },
  )

export default function Facilities() {
  const { currentUser, userProfile } = useAuth()
  const isAdmin = userProfile?.role === 'Administrator'

  const [facilities, setFacilities] = useState([])
  const [form, setForm] = useState(createEmptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load facilities when the authenticated user or role changes.
  useEffect(() => {
    let active = true

    currentUser
      .getIdToken()
      .then((token) => fetchFacilities(token, isAdmin))
      .then((data) => {
        if (active) {
          setFacilities(data.facilities || [])
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
  }, [currentUser, isAdmin])

  const refreshFacilities = async () => {
    const token = await currentUser.getIdToken()
    const data = await fetchFacilities(token, isAdmin)
    setFacilities(data.facilities || [])
  }

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const updateRate = (vehicleType, field, value) => {
    setForm((previous) => ({
      ...previous,
      rates: previous.rates.map((rate) =>
        rate.vehicleType === vehicleType
          ? { ...rate, [field]: value }
          : rate,
      ),
    }))
  }

  const resetForm = () => {
    setForm(createEmptyForm())
    setEditingId(null)
    setShowForm(false)
  }

  const openCreateForm = () => {
    setForm(createEmptyForm())
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const handleEdit = (facility) => {
    setForm({
      name: facility.name || '',
      description: facility.description || '',
      address: facility.address || '',
      city: facility.city || '',
      state: facility.state || '',
      postalCode: facility.postalCode || '',
      latitude: facility.latitude ?? '',
      longitude: facility.longitude ?? '',
      contactPhone: facility.contactPhone || '',
      totalCapacity: String(facility.totalCapacity || ''),
      open: facility.operatingHours?.open || '06:00',
      close: facility.operatingHours?.close || '23:00',
      is24Hours: Boolean(facility.operatingHours?.is24Hours),
      amenities: (facility.amenities || []).join(', '),
      status: facility.status || 'Active',
      rates: VEHICLE_TYPES.map((vehicleType) => {
        const existingRate = facility.rates?.find(
          (rate) => rate.vehicleType === vehicleType,
        )

        return {
          vehicleType,
          hourlyRate:
            existingRate?.hourlyRate != null
              ? String(existingRate.hourlyRate)
              : '',
          dailyRate:
            existingRate?.dailyRate != null
              ? String(existingRate.dailyRate)
              : '',
        }
      }),
    })

    setEditingId(facility._id)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!isAdmin) return

    const selectedRates = form.rates.filter(
      (rate) =>
        rate.hourlyRate !== '' || rate.dailyRate !== '',
    )

    if (selectedRates.length === 0) {
      setError('Add at least one vehicle parking rate.')
      return
    }

    if (
      selectedRates.some(
        (rate) =>
          rate.hourlyRate === '' ||
          rate.dailyRate === '' ||
          Number(rate.hourlyRate) < 0 ||
          Number(rate.dailyRate) < 0,
      )
    ) {
      setError('Enter valid hourly and daily rates for every selected vehicle type.')
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
      contactPhone: form.contactPhone.trim(),
      totalCapacity: Number(form.totalCapacity),
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
      operatingHours: {
        open: form.open,
        close: form.close,
        is24Hours: form.is24Hours,
      },
      amenities: form.amenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      rates: selectedRates.map((rate) => ({
        vehicleType: rate.vehicleType,
        hourlyRate: Number(rate.hourlyRate),
        dailyRate: Number(rate.dailyRate),
      })),
      status: form.status,
    }

    if (
      !Number.isInteger(payload.totalCapacity) ||
      payload.totalCapacity < 1
    ) {
      setError('Enter a valid facility capacity.')
      return
    }

    if (
      (payload.latitude === null) !==
      (payload.longitude === null)
    ) {
      setError('Enter both latitude and longitude, or leave both blank.')
      return
    }

    setSaving(true)

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(
        editingId
          ? `/api/facilities/${editingId}`
          : '/api/facilities',
        {
          token,
          method: editingId ? 'PUT' : 'POST',
          body: payload,
        },
      )

      setSuccess(data.message)
      resetForm()
      await refreshFacilities()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (facility) => {
    const action =
      facility.status === 'Active' ? 'deactivate' : 'reactivate'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${facility.name}?`,
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      const token = await currentUser.getIdToken()

      const data =
        action === 'deactivate'
          ? await apiRequest(`/api/facilities/${facility._id}`, {
              token,
              method: 'DELETE',
            })
          : await apiRequest(`/api/facilities/${facility._id}`, {
              token,
              method: 'PUT',
              body: { status: 'Active' },
            })

      setSuccess(data.message)
      await refreshFacilities()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Building2 size={26} />
          </div>

          <h2 className="text-2xl font-bold">
            Parking Facilities
          </h2>

          <p className="mt-2 text-sm text-blue-100">
            Explore parking locations, capacity and parking rates.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            <Plus size={18} />
            Add Facility
          </button>
        )}
      </section>

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

      {showForm && isAdmin && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              {editingId ? 'Edit Parking Facility' : 'Add Parking Facility'}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              aria-label="Close facility form"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h4 className="mb-4 font-semibold text-slate-700">
                Facility Information
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Facility Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    minLength={2}
                    maxLength={100}
                    required
                    placeholder="e.g. Central Mall Parking"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Total Parking Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.totalCapacity}
                    onChange={(e) => updateField('totalCapacity', e.target.value)}
                    required
                    placeholder="e.g. 150"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Describe the parking facility..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Street Address *
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    required
                    maxLength={200}
                    placeholder="Enter the complete street address"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    City *
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    State *
                  </label>
                  <input
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Postal Code
                  </label>
                  <input
                    value={form.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => updateField('contactPhone', e.target.value)}
                    maxLength={20}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Latitude (optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={(e) => updateField('latitude', e.target.value)}
                    placeholder="e.g. 19.0760"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Longitude (optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={(e) => updateField('longitude', e.target.value)}
                    placeholder="e.g. 72.8777"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="mb-4 font-semibold text-slate-700">
                Operating Hours
              </h4>

              <label className="mb-4 flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is24Hours}
                  onChange={(e) => updateField('is24Hours', e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                Open 24 hours
              </label>

              {!form.is24Hours && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={form.open}
                      onChange={(e) => updateField('open', e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={form.close}
                      onChange={(e) => updateField('close', e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="mb-4 font-semibold text-slate-700">
                Parking Rates (INR)
              </h4>

              <p className="mb-4 text-xs text-slate-500">
                Enter hourly and daily rates for the vehicle categories supported by this facility. Leave both fields blank for categories not supported.
              </p>

              <div className="space-y-3">
                {form.rates.map((rate) => (
                  <div
                    key={rate.vehicleType}
                    className="grid items-center gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3"
                  >
                    <p className="text-sm font-semibold text-slate-700">
                      {rate.vehicleType}
                    </p>

                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Hourly rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.hourlyRate}
                        onChange={(e) =>
                          updateRate(rate.vehicleType, 'hourlyRate', e.target.value)
                        }
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Daily rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.dailyRate}
                        onChange={(e) =>
                          updateRate(rate.vehicleType, 'dailyRate', e.target.value)
                        }
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="mb-4 font-semibold text-slate-700">
                Amenities and Status
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Amenities
                  </label>
                  <input
                    value={form.amenities}
                    onChange={(e) => updateField('amenities', e.target.value)}
                    placeholder="CCTV, Security, EV Charging"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Separate amenities with commas.
                  </p>
                </div>

                {editingId && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Facility Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => updateField('status', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Facility'
                    : 'Create Facility'}
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
            {isAdmin ? 'Facility Management' : 'Available Facilities'}
          </h3>

          <span className="text-sm text-slate-500">
            {facilities.length} facility/facilities
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading parking facilities...
          </div>
        ) : facilities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Building2 size={40} className="mx-auto text-slate-300" />
            <h4 className="mt-4 font-semibold text-slate-700">
              No parking facilities found
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              {isAdmin
                ? 'Add your first parking facility to get started.'
                : 'There are currently no active parking facilities.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {facilities.map((facility) => (
              <article
                key={facility._id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Building2 size={24} />
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800">
                          {facility.name}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {facility.city}, {facility.state}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        facility.status === 'Active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {facility.status}
                    </span>
                  </div>

                  {facility.description && (
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {facility.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex items-start gap-2">
                      <MapPin size={17} className="mt-0.5 shrink-0 text-blue-500" />
                      {facility.address}
                      {facility.postalCode && `, ${facility.postalCode}`}
                    </p>

                    <p className="flex items-center gap-2">
                      <Building2 size={17} className="text-blue-500" />
                      Capacity: {facility.totalCapacity} vehicles
                    </p>

                    <p className="flex items-center gap-2">
                      <Clock3 size={17} className="text-blue-500" />
                      {facility.operatingHours?.is24Hours
                        ? 'Open 24 hours'
                        : `${facility.operatingHours?.open || 'N/A'} – ${facility.operatingHours?.close || 'N/A'}`}
                    </p>

                    {facility.contactPhone && (
                      <p className="flex items-center gap-2">
                        <Phone size={17} className="text-blue-500" />
                        {facility.contactPhone}
                      </p>
                    )}
                  </div>

                  {facility.amenities?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {facility.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <h5 className="mb-3 text-sm font-bold text-slate-800">
                      Parking Rates
                    </h5>

                    {facility.rates?.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs text-slate-500">
                              <th className="py-2">Vehicle</th>
                              <th className="py-2">Hourly</th>
                              <th className="py-2">Daily</th>
                            </tr>
                          </thead>
                          <tbody>
                            {facility.rates.map((rate) => (
                              <tr
                                key={rate.vehicleType}
                                className="border-b border-slate-50 text-slate-700"
                              >
                                <td className="py-2">{rate.vehicleType}</td>
                                <td className="py-2">₹{rate.hourlyRate}</td>
                                <td className="py-2">₹{rate.dailyRate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Rates not configured.
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => handleEdit(facility)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(facility)}
                        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                          facility.status === 'Active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        <Power size={15} />
                        {facility.status === 'Active'
                          ? 'Deactivate'
                          : 'Reactivate'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
