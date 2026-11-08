
import { useEffect, useState } from 'react'
import {
  ParkingSquare,
  Plus,
  Pencil,
  MapPin,
  X,
  CarFront,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const EMPTY_FORM = {
  slotNumber: '',
  vehicleType: '',
  floor: 'Ground Floor',
  section: '',
}

const STATUSES = ['Available', 'Occupied', 'Unavailable']

export default function Slots() {
  const { currentUser, userProfile } = useAuth()

  const isAdmin = userProfile?.role === 'Administrator'
  const canOperate = ['Parking Staff', 'Administrator'].includes(
    userProfile?.role,
  )

  const [facilities, setFacilities] = useState([])
  const [selectedFacility, setSelectedFacility] = useState('')
  const [slots, setSlots] = useState([])
  const [facilityLoading, setFacilityLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const currentFacility = facilities.find(
    (facility) => facility._id === selectedFacility,
  )

  const supportedTypes =
    currentFacility?.rates?.map((rate) => rate.vehicleType) || []

  // Load active facilities.
  useEffect(() => {
    let active = true

    currentUser
      .getIdToken()
      .then((token) => apiRequest('/api/facilities', { token }))
      .then((data) => {
        if (!active) return

        const list = data.facilities || []

        setFacilities(list)

        setSelectedFacility((current) =>
          current || list[0]?._id || '',
        )

        if (list.length === 0) {
          setSlotsLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
          setSlotsLoading(false)
        }
      })
      .finally(() => {
        if (active) {
          setFacilityLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [currentUser])

  // Load slots whenever the selected facility changes.
  useEffect(() => {
    if (!selectedFacility) return

    let active = true

    currentUser
      .getIdToken()
      .then((token) =>
        apiRequest(
          `/api/slots/facility/${selectedFacility}`,
          { token },
        ),
      )
      .then((data) => {
        if (active) {
          setSlots(data.slots || [])
          setError('')
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
          setSlots([])
        }
      })
      .finally(() => {
        if (active) {
          setSlotsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedFacility, currentUser])

  const refreshSlots = async () => {
    if (!selectedFacility) return

    setSlotsLoading(true)

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(
        `/api/slots/facility/${selectedFacility}`,
        { token },
      )

      setSlots(data.slots || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleFacilityChange = (event) => {
    const facilityId = event.target.value
    const facility = facilities.find(
      (item) => item._id === facilityId,
    )

    setSelectedFacility(facilityId)
    setSlotsLoading(true)
    setError('')
    setSuccess('')

    setForm({
      ...EMPTY_FORM,
      vehicleType: facility?.rates?.[0]?.vehicleType || '',
    })

    setShowForm(false)
    setEditingId(null)
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const openCreateForm = () => {
    setForm({
      ...EMPTY_FORM,
      vehicleType: supportedTypes[0] || '',
    })

    setEditingId(null)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleEdit = (slot) => {
    setForm({
      slotNumber: slot.slotNumber,
      vehicleType: slot.vehicleType,
      floor: slot.floor || 'Ground Floor',
      section: slot.section || '',
    })

    setEditingId(slot._id)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      vehicleType: supportedTypes[0] || '',
    })

    setEditingId(null)
    setShowForm(false)
  }

  // Create or update a parking slot.
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isAdmin || !selectedFacility) return

    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const token = await currentUser.getIdToken()

      const body = {
        slotNumber: form.slotNumber.trim().toUpperCase(),
        vehicleType: form.vehicleType,
        floor: form.floor.trim(),
        section: form.section.trim(),
      }

      const data = await apiRequest(
        editingId
          ? `/api/slots/${editingId}`
          : '/api/slots',
        {
          token,
          method: editingId ? 'PUT' : 'POST',
          body: editingId
            ? body
            : { ...body, facilityId: selectedFacility },
        },
      )

      setSuccess(data.message)
      resetForm()
      await refreshSlots()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Staff and Administrators can update operational status.
  const handleStatusChange = async (slot, status) => {
    setError('')
    setSuccess('')

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(
        `/api/slots/${slot._id}/status`,
        {
          token,
          method: 'PATCH',
          body: { status },
        },
      )

      setSuccess(data.message)
      await refreshSlots()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeactivate = async (slot) => {
    const confirmed = window.confirm(
      `Mark slot ${slot.slotNumber} as unavailable?`,
    )

    if (!confirmed) return

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(`/api/slots/${slot._id}`, {
        token,
        method: 'DELETE',
      })

      setSuccess(data.message)
      await refreshSlots()
    } catch (err) {
      setError(err.message)
    }
  }

  const countStatus = (status) =>
    slots.filter((slot) => slot.status === status).length

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <ParkingSquare size={26} />
          </div>

          <h2 className="text-2xl font-bold">
            Parking Slot Management
          </h2>

          <p className="mt-2 text-sm text-blue-100">
            View and manage parking spaces across facilities.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateForm}
            disabled={
              !selectedFacility ||
              supportedTypes.length === 0
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <Plus size={18} />
            Add Slot
          </button>
        )}
      </section>

      {/* FACILITY SELECTION */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Select Parking Facility
        </label>

        <select
          value={selectedFacility}
          onChange={handleFacilityChange}
          disabled={facilityLoading || facilities.length === 0}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 sm:max-w-xl"
        >
          <option value="">Select a facility</option>

          {facilities.map((facility) => (
            <option key={facility._id} value={facility._id}>
              {facility.name} — {facility.city}
            </option>
          ))}
        </select>

        {currentFacility && (
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={14} />
            {currentFacility.address}, {currentFacility.city}
          </p>
        )}
      </section>

      {/* MESSAGES */}
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

      {/* SLOT SUMMARY */}
      {selectedFacility && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Slots',
              value: slots.length,
              color: 'text-blue-600',
            },
            {
              label: 'Available',
              value: countStatus('Available'),
              color: 'text-green-600',
            },
            {
              label: 'Occupied',
              value: countStatus('Occupied'),
              color: 'text-orange-600',
            },
            {
              label: 'Unavailable',
              value: countStatus('Unavailable'),
              color: 'text-slate-500',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">
                {card.label}
              </p>
              <p className={`mt-2 text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* SLOT FORM */}
      {showForm && isAdmin && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              {editingId ? 'Edit Parking Slot' : 'Create Parking Slot'}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              aria-label="Close slot form"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Slot Number *
                </label>

                <input
                  name="slotNumber"
                  value={form.slotNumber}
                  onChange={handleFormChange}
                  required
                  minLength={2}
                  maxLength={20}
                  placeholder="e.g. A-001"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Vehicle Type *
                </label>

                <select
                  name="vehicleType"
                  value={form.vehicleType}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                >
                  {supportedTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Floor
                </label>

                <input
                  name="floor"
                  value={form.floor}
                  onChange={handleFormChange}
                  maxLength={30}
                  placeholder="e.g. Ground Floor"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Section
                </label>

                <input
                  name="section"
                  value={form.section}
                  onChange={handleFormChange}
                  maxLength={30}
                  placeholder="e.g. Section A"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || supportedTypes.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Slot'
                    : 'Create Slot'}
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

      {/* SLOT LIST */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {userProfile?.role === 'Customer'
              ? 'Available Parking Slots'
              : 'Facility Slots'}
          </h3>

          <span className="text-sm text-slate-500">
            {slots.length} slot(s)
          </span>
        </div>

        {facilityLoading || slotsLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading parking slots...
          </div>
        ) : !selectedFacility ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <ParkingSquare
              size={40}
              className="mx-auto text-slate-300"
            />
            <p className="mt-4 font-semibold text-slate-700">
              No active parking facilities found.
            </p>
            {isAdmin && (
              <p className="mt-2 text-sm text-slate-500">
                Create an active facility before adding parking slots.
              </p>
            )}
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <ParkingSquare
              size={40}
              className="mx-auto text-slate-300"
            />
            <p className="mt-4 font-semibold text-slate-700">
              {userProfile?.role === 'Customer'
                ? 'No available parking slots.'
                : 'No parking slots created yet.'}
            </p>
            {isAdmin && (
              <p className="mt-2 text-sm text-slate-500">
                Use Add Slot to create the first parking space.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {slots.map((slot) => (
              <article
                key={slot._id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ParkingSquare size={23} />
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      slot.status === 'Available'
                        ? 'bg-green-50 text-green-700'
                        : slot.status === 'Occupied'
                          ? 'bg-orange-50 text-orange-700'
                          : slot.status === 'Reserved'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {slot.status}
                  </span>
                </div>

                <h4 className="mt-4 text-xl font-bold text-slate-800">
                  {slot.slotNumber}
                </h4>

                <div className="mt-3 space-y-2 text-sm text-slate-500">
                  <p className="flex items-center gap-2">
                    <CarFront size={16} />
                    {slot.vehicleType}
                  </p>

                  <p className="flex items-center gap-2">
                    <MapPin size={16} />
                    {slot.floor || 'Ground Floor'}
                  </p>

                  {slot.section && (
                    <p>Section: {slot.section}</p>
                  )}
                </div>

                {canOperate && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <label className="mb-2 block text-xs font-medium text-slate-500">
                      Update operational status
                    </label>

                    <select
                      value={slot.status}
                      disabled={slot.status === 'Reserved'}
                      onChange={(event) =>
                        handleStatusChange(slot, event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                    >
                      {slot.status === 'Reserved' && (
                        <option value="Reserved">
                          Reserved — Booking controlled
                        </option>
                      )}

                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {slot.status === 'Reserved' && (
                      <p className="mt-2 text-xs text-slate-400">
                        Reservation statuses are managed by the booking system.
                      </p>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={['Occupied', 'Reserved'].includes(slot.status)}
                      onClick={() => handleEdit(slot)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    {slot.status !== 'Unavailable' && (
                      <button
                        type="button"
                        disabled={['Occupied', 'Reserved'].includes(slot.status)}
                        onClick={() => handleDeactivate(slot)}
                        className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
