import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { UserRound, Save } from 'lucide-react'

export default function Profile() {
  const { userProfile, updateUserProfile } = useAuth()

  const [name, setName] = useState(userProfile?.name || '')
  const [phone, setPhone] = useState(userProfile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (name.trim().length < 2) {
      setError('Name must contain at least 2 characters.')
      return
    }

    setSaving(true)

    try {
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
      })

      setSuccess('Your profile was updated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <UserRound size={30} />
          </div>

          <div>
            <h2 className="text-2xl font-bold">My Profile</h2>
            <p className="mt-1 text-sm text-blue-100">
              View and manage your account information.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-lg font-bold text-slate-800">
          Personal Information
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={60}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              value={userProfile?.email || ''}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Email is managed through your authentication account.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={20}
              placeholder="Enter your phone number"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Account Role
            </label>
            <input
              type="text"
              value={userProfile?.role || ''}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Account roles can only be assigned by an administrator.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </section>
    </div>
  )
}