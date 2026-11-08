
import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CreditCard,
  Smartphone,
  Landmark,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock3,
  Download,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const PAYMENT_METHODS = [
  {
    value: 'UPI',
    label: 'UPI',
    description: 'Simulated UPI payment',
    icon: Smartphone,
  },
  {
    value: 'Card',
    label: 'Debit / Credit Card',
    description: 'Simulated card payment',
    icon: CreditCard,
  },
  {
    value: 'Net Banking',
    label: 'Net Banking',
    description: 'Simulated net banking payment',
    icon: Landmark,
  },
]

const formatDate = (value) =>
  value ? new Date(value).toLocaleString() : 'N/A'

const formatAmount = (amount) =>
  `₹${Number(amount || 0).toFixed(2)}`

export default function Payments() {
  const { currentUser } = useAuth()
  const location = useLocation()

  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])

  const [selectedBookingId, setSelectedBookingId] = useState(
    location.state?.bookingId || '',
  )

  const [selectedMethod, setSelectedMethod] = useState('UPI')
  const [simulationOutcome, setSimulationOutcome] = useState('Success')

  const [selectedReceipt, setSelectedReceipt] = useState(null)

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadPaymentData = useCallback(async () => {
    const token = await currentUser.getIdToken()

    const [bookingData, paymentData] = await Promise.all([
      apiRequest('/api/bookings/my', { token }),
      apiRequest('/api/payments/my', { token }),
    ])

    return {
      bookings: bookingData.bookings || [],
      payments: paymentData.payments || [],
    }
  }, [currentUser])

  // Load customer bookings and payment history.
  useEffect(() => {
    let active = true

    loadPaymentData()
      .then((data) => {
        if (active) {
          setBookings(data.bookings)
          setPayments(data.payments)
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadPaymentData])

  const refreshPaymentData = async () => {
    const data = await loadPaymentData()
    setBookings(data.bookings)
    setPayments(data.payments)
  }

  const pendingBookings = bookings.filter(
    (booking) =>
      booking.status === 'Pending Payment' &&
      booking.paymentStatus !== 'Paid',
  )

  const selectedBooking = pendingBookings.find(
    (booking) => booking._id === selectedBookingId,
  )

  // Process a payment through the demo simulator.
  const handlePayment = async (event) => {
    event.preventDefault()

    if (!selectedBooking) {
      setError('Please select a pending booking.')
      return
    }

    setError('')
    setSuccess('')
    setProcessing(true)

    try {
      const token = await currentUser.getIdToken()

      const data = await apiRequest(
        `/api/payments/${selectedBooking._id}/process`,
        {
          token,
          method: 'POST',
          body: {
            method: selectedMethod,
            simulationOutcome,
          },
        },
      )

      setSuccess(data.message)
      setSelectedBookingId('')
      await refreshPaymentData()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handlePrintReceipt = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        Loading payment information...
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
          <CreditCard size={26} />
        </div>

        <h2 className="text-2xl font-bold">
          Payments & Billing
        </h2>

        <p className="mt-2 text-sm text-blue-100">
          Complete pending reservations and view your payment history.
        </p>
      </section>

      {/* DEMO NOTICE */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Demo Payment Mode:</strong> All transactions are simulated.
        No real money is charged and no actual card, UPI or banking
        credentials are required.
      </div>

      {/* FEEDBACK */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <XCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} className="shrink-0" />
          {success}
        </div>
      )}

      {/* PENDING BOOKINGS */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Pending Payments
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Complete payment to confirm your reservation.
            </p>
          </div>

          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            {pendingBookings.length} pending
          </span>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <CheckCircle2
              size={36}
              className="mx-auto text-green-500"
            />
            <p className="mt-3 font-semibold text-slate-700">
              No pending payments
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Your unpaid reservations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <button
                key={booking._id}
                type="button"
                onClick={() => {
                  setSelectedBookingId(booking._id)
                  setError('')
                  setSuccess('')
                }}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedBookingId === booking._id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {booking.facility?.name || 'Parking Facility'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Reference: {booking.bookingReference}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Slot: {booking.slot?.slotNumber || 'N/A'}
                      {' · '}
                      Vehicle: {booking.vehicle?.registrationNumber || 'N/A'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-800">
                      {formatAmount(booking.totalAmount)}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-1 text-xs text-orange-700">
                      Pending
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* PAYMENT CHECKOUT */}
      {selectedBooking && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800">
            Complete Your Payment
          </h3>

          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Booking Reference
            </p>

            <p className="mt-1 font-semibold text-slate-800">
              {selectedBooking.bookingReference}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-sm text-slate-600">
                Total Amount
              </span>
              <span className="text-2xl font-bold text-blue-700">
                {formatAmount(selectedBooking.totalAmount)}
              </span>
            </div>
          </div>

          <form onSubmit={handlePayment} className="mt-6 space-y-5">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-700">
                Select Payment Method
              </h4>

              <div className="grid gap-3 md:grid-cols-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon
                  const selected = selectedMethod === method.value

                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setSelectedMethod(method.value)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <Icon
                        size={24}
                        className={selected ? 'text-blue-600' : 'text-slate-400'}
                      />

                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        {method.label}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {method.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Simulated Transaction Outcome
              </label>

              <select
                value={simulationOutcome}
                onChange={(event) =>
                  setSimulationOutcome(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 sm:max-w-md"
              >
                <option value="Success">
                  Successful Payment
                </option>
                <option value="Failed">
                  Failed Payment
                </option>
              </select>

              <p className="mt-2 text-xs text-slate-500">
                This option is only for testing the payment simulator.
              </p>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {processing
                ? 'Processing Payment...'
                : `Pay ${formatAmount(selectedBooking.totalAmount)}`}
            </button>
          </form>
        </section>
      )}

      {/* PAYMENT HISTORY */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            Payment History
          </h3>

          <span className="text-sm text-slate-500">
            {payments.length} transaction(s)
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Receipt
              size={40}
              className="mx-auto text-slate-300"
            />
            <h4 className="mt-4 font-semibold text-slate-700">
              No payments yet
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              Your completed and failed transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <article
                key={payment._id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-slate-800">
                        {payment.paymentReference}
                      </h4>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          payment.status === 'Success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Booking: {payment.booking?.bookingReference || 'N/A'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Method: {payment.method}
                      {' · '}
                      Attempt: {payment.attemptNumber}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Clock3 size={13} />
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <p className="text-xl font-bold text-slate-800">
                      {formatAmount(payment.amount)}
                    </p>

                    {payment.status === 'Success' && (
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(payment)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Receipt size={16} />
                        Receipt
                      </button>
                    )}
                  </div>
                </div>

                {payment.failureReason && (
                  <p className="mt-3 text-xs text-red-500">
                    {payment.failureReason}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* PRINTABLE RECEIPT */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
          <div className="payment-receipt w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">

            <div className="mb-6 flex items-center justify-between no-print">
              <h3 className="text-lg font-bold text-slate-800">
                Payment Receipt
              </h3>

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                aria-label="Close receipt"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <XCircle size={21} />
              </button>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 size={32} />
              </div>

              <h2 className="mt-4 text-2xl font-bold text-slate-800">
                ParkEase
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Parking Payment Receipt
              </p>

              <p className="mt-5 text-sm font-semibold text-green-600">
                PAYMENT SUCCESSFUL
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatAmount(selectedReceipt.amount)}
              </p>
            </div>

            <div className="my-6 space-y-3 border-y border-dashed border-slate-300 py-5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Payment Reference</span>
                <span className="text-right font-semibold text-slate-800">
                  {selectedReceipt.paymentReference}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Booking Reference</span>
                <span className="text-right font-semibold text-slate-800">
                  {selectedReceipt.booking?.bookingReference || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Facility</span>
                <span className="text-right font-semibold text-slate-800">
                  {selectedReceipt.booking?.facility?.name || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Parking Slot</span>
                <span className="text-right font-semibold text-slate-800">
                  {selectedReceipt.booking?.slot?.slotNumber || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Vehicle</span>
                <span className="text-right font-semibold text-slate-800">
                  {selectedReceipt.booking?.vehicle?.registrationNumber || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-semibold text-slate-800">
                  {selectedReceipt.method}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Payment Date</span>
                <span className="text-right font-semibold text-slate-800">
                  {formatDate(selectedReceipt.paidAt)}
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400">
              This is a computer-generated simulated payment receipt.
              No actual payment was collected.
            </p>

            <button
              type="button"
              onClick={handlePrintReceipt}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 no-print"
            >
              <Download size={18} />
              Print / Save Receipt
            </button>

            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }

                .payment-receipt,
                .payment-receipt * {
                  visibility: visible !important;
                }

                .payment-receipt {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: none !important;
                  box-shadow: none !important;
                }

                .no-print {
                  display: none !important;
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  )
}
