
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search as SearchIcon,
  MapPin,
  Clock3,
  Building2,
  ParkingSquare,
  ChevronDown,
  ChevronUp,
  Phone,
  CalendarCheck,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const VEHICLE_TYPES = [
  'All Types',
  'Car',
  'Motorcycle',
  'SUV',
  'Van',
  'Other',
]

export default function Search() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [facilities, setFacilities] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [vehicleType, setVehicleType] = useState('All Types')
  const [availabilityFilter, setAvailabilityFilter] = useState('All')

  const [appliedFilters, setAppliedFilters] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch active facilities and their available slots.
  const loadFacilities = async () => {
    const token = await currentUser.getIdToken()

    const facilityData = await apiRequest('/api/facilities', {
      token,
    })

    const facilityList = facilityData.facilities || []

    const results = await Promise.all(
      facilityList.map(async (facility) => {
        const slotData = await apiRequest(
          `/api/slots/facility/${facility._id}`,
          { token },
        )

        return {
          ...facility,
          availableSlots: slotData.slots || [],
        }
      }),
    )

    return results
  }

  // Execute search only when the user clicks Search Parking.
  const performSearch = async () => {
    const filters = {
      searchQuery: searchQuery.trim(),
      vehicleType,
      availabilityFilter,
    }

    setAppliedFilters(filters)
    setHasSearched(true)
    setExpandedId(null)
    setFacilities([])
    setError('')
    setLoading(true)

    try {
      const results = await loadFacilities()
      setFacilities(results)
    } catch (err) {
      setError(
        err.message || 'Unable to search parking facilities.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    performSearch()
  }

  // Apply only the filters submitted by the user.
  const filteredFacilities = useMemo(() => {
    if (!appliedFilters) return []

    const query = appliedFilters.searchQuery.toLowerCase()

    return facilities.filter((facility) => {
      const searchableText = [
        facility.name,
        facility.address,
        facility.city,
        facility.state,
        facility.postalCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !query || searchableText.includes(query)

      const matchingRates =
        appliedFilters.vehicleType === 'All Types' ||
        facility.rates?.some(
          (rate) =>
            rate.vehicleType === appliedFilters.vehicleType,
        )

      const matchingSlots =
        appliedFilters.vehicleType === 'All Types'
          ? facility.availableSlots
          : facility.availableSlots.filter(
              (slot) =>
                slot.vehicleType === appliedFilters.vehicleType,
            )

      const matchesAvailability =
        appliedFilters.availabilityFilter === 'All' ||
        matchingSlots.length > 0

      return (
        matchesSearch &&
        matchingRates &&
        matchesAvailability
      )
    })
  }, [facilities, appliedFilters])

  // Get available slots matching the submitted vehicle filter.
  const getMatchingSlots = (facility) => {
    if (appliedFilters?.vehicleType === 'All Types') {
      return facility.availableSlots
    }

    return facility.availableSlots.filter(
      (slot) =>
        slot.vehicleType === appliedFilters?.vehicleType,
    )
  }

  // Reset search form and results.
  const handleClearFilters = () => {
    setSearchQuery('')
    setVehicleType('All Types')
    setAvailabilityFilter('All')
    setAppliedFilters(null)
    setHasSearched(false)
    setFacilities([])
    setExpandedId(null)
    setError('')
    setLoading(false)
  }

  // Navigate to the booking page with the selected facility.
  const handleBooking = (facilityId) => {
    navigate('/bookings', {
      state: { facilityId },
    })
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
          <SearchIcon size={26} />
        </div>

        <h2 className="text-2xl font-bold">
          Find Parking
        </h2>

        <p className="mt-2 text-sm text-blue-100">
          Discover parking facilities and find available
          spaces for your vehicle.
        </p>
      </section>

      {/* SEARCH FORM */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">
          Search Parking Facilities
        </h3>

        <form onSubmit={handleSearch}>
          <div className="grid gap-4 md:grid-cols-2">

            {/* LOCATION SEARCH */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Facility Name or Location
              </label>

              <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 focus-within:border-blue-500">
                <SearchIcon
                  size={19}
                  className="text-slate-400"
                />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Search by name, city or address..."
                  className="w-full py-3 text-sm outline-none"
                />
              </div>
            </div>

            {/* VEHICLE TYPE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Vehicle Type
              </label>

              <select
                value={vehicleType}
                onChange={(event) =>
                  setVehicleType(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* AVAILABILITY */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Availability
              </label>

              <select
                value={availabilityFilter}
                onChange={(event) =>
                  setAvailabilityFilter(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="All">All Facilities</option>
                <option value="Available">
                  Available Slots Only
                </option>
              </select>
            </div>

          </div>

          {/* SEARCH ACTIONS */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">

            <p className="text-sm text-slate-500">
              {hasSearched
                ? `${filteredFacilities.length} facility/facilities found`
                : 'Enter your search criteria to find parking.'}
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Clear Filters
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SearchIcon size={17} />
                {loading ? 'Searching...' : 'Search Parking'}
              </button>
            </div>

          </div>
        </form>
      </section>

      {/* SEARCH RESULTS */}
      {hasSearched && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              Parking Search Results
            </h3>

            <span className="text-xs text-slate-500">
              Latest database results
            </span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              <SearchIcon
                size={30}
                className="mx-auto mb-3 animate-pulse text-blue-500"
              />
              Searching parking facilities...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={performSearch}
                className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Retry Search
              </button>
            </div>
          ) : filteredFacilities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Building2
                size={42}
                className="mx-auto text-slate-300"
              />

              <h4 className="mt-4 font-semibold text-slate-700">
                No matching facilities found
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search term or filters.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500">
                Showing {filteredFacilities.length} matching facilities.
              </p>

              <div className="grid gap-5 lg:grid-cols-2">
                {filteredFacilities.map((facility) => {
                  const matchingSlots = getMatchingSlots(facility)

                  const isExpanded =
                    expandedId === facility._id

                  const matchingRates =
                    appliedFilters.vehicleType === 'All Types'
                      ? facility.rates || []
                      : (facility.rates || []).filter(
                          (rate) =>
                            rate.vehicleType ===
                            appliedFilters.vehicleType,
                        )

                  return (
                    <article
                      key={facility._id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                    >
                      <div className="p-5">

                        {/* FACILITY HEADER */}
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Building2 size={24} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-800">
                              {facility.name}
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                              {facility.city}, {facility.state}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Active
                          </span>
                        </div>

                        {/* LOCATION */}
                        <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
                          <MapPin
                            size={17}
                            className="mt-0.5 shrink-0 text-blue-500"
                          />

                          <span>
                            {facility.address}
                            {facility.postalCode &&
                              `, ${facility.postalCode}`}
                          </span>
                        </div>

                        {/* CAPACITY AND AVAILABILITY */}
                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-blue-50 p-4">
                            <p className="text-xs text-slate-500">
                              Total Capacity
                            </p>

                            <p className="mt-1 text-2xl font-bold text-blue-700">
                              {facility.totalCapacity}
                            </p>
                          </div>

                          <div className="rounded-lg bg-green-50 p-4">
                            <p className="text-xs text-slate-500">
                              Available Slots
                            </p>

                            <p className="mt-1 text-2xl font-bold text-green-700">
                              {matchingSlots.length}
                            </p>
                          </div>
                        </div>

                        {/* PARKING RATES */}
                        <div className="mt-5">
                          <h5 className="mb-3 text-sm font-bold text-slate-800">
                            Parking Rates
                          </h5>

                          <div className="space-y-2">
                            {matchingRates.map((rate) => (
                              <div
                                key={rate.vehicleType}
                                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                              >
                                <span className="text-sm text-slate-600">
                                  {rate.vehicleType}
                                </span>

                                <span className="text-xs font-semibold text-slate-700">
                                  ₹{rate.hourlyRate}/hr · ₹{rate.dailyRate}/day
                                </span>
                              </div>
                            ))}

                            {matchingRates.length === 0 && (
                              <p className="text-xs text-slate-500">
                                No rates configured for this vehicle.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* BOOKING BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleBooking(facility._id)}
                          disabled={matchingSlots.length === 0}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CalendarCheck size={17} />
                          {matchingSlots.length > 0
                            ? 'Book at this Facility'
                            : 'No Available Slots'}
                        </button>

                        {/* DETAILS TOGGLE */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(
                              isExpanded ? null : facility._id,
                            )
                          }
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          {isExpanded ? (
                            <>
                              Show Less
                              <ChevronUp size={17} />
                            </>
                          ) : (
                            <>
                              View Facility Details
                              <ChevronDown size={17} />
                            </>
                          )}
                        </button>

                        {/* EXPANDED DETAILS */}
                        {isExpanded && (
                          <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">

                            {facility.description && (
                              <div>
                                <h5 className="text-sm font-bold text-slate-800">
                                  About Facility
                                </h5>

                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {facility.description}
                                </p>
                              </div>
                            )}

                            <div>
                              <h5 className="mb-2 text-sm font-bold text-slate-800">
                                Operating Hours
                              </h5>

                              <p className="flex items-center gap-2 text-sm text-slate-600">
                                <Clock3
                                  size={16}
                                  className="text-blue-500"
                                />

                                {facility.operatingHours?.is24Hours
                                  ? 'Open 24 hours'
                                  : `${facility.operatingHours?.open || 'N/A'} – ${facility.operatingHours?.close || 'N/A'}`}
                              </p>
                            </div>

                            {facility.amenities?.length > 0 && (
                              <div>
                                <h5 className="mb-2 text-sm font-bold text-slate-800">
                                  Available Amenities
                                </h5>

                                <div className="flex flex-wrap gap-2">
                                  {facility.amenities.map((amenity) => (
                                    <span
                                      key={amenity}
                                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                                    >
                                      {amenity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {facility.contactPhone && (
                              <p className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone
                                  size={16}
                                  className="text-blue-500"
                                />
                                {facility.contactPhone}
                              </p>
                            )}

                            <div>
                              <h5 className="mb-3 text-sm font-bold text-slate-800">
                                Available Parking Spaces
                              </h5>

                              {matchingSlots.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {matchingSlots.map((slot) => (
                                    <span
                                      key={slot._id}
                                      className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700"
                                    >
                                      <ParkingSquare size={14} />
                                      {slot.slotNumber}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500">
                                  No available slots for the selected vehicle type.
                                </p>
                              )}
                            </div>

                          </div>
                        )}

                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* INITIAL STATE */}
      {!hasSearched && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <SearchIcon
            size={44}
            className="mx-auto text-slate-300"
          />

          <h3 className="mt-4 text-lg font-bold text-slate-700">
            Ready to Find Parking?
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Enter a facility name or location, select your
            vehicle type and availability preference, then
            click Search Parking to discover matching facilities.
          </p>
        </section>
      )}

      <p className="text-center text-xs text-slate-400">
        Slot availability reflects the latest data fetched from ParkEase.
        Final availability will be revalidated when making a reservation.
      </p>
    </div>
  )
}
