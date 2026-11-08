import { useEffect, useRef, useState } from 'react'
import { AuthContext } from './AuthContext.js'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../config/firebase'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000'

const syncWithBackend = async (user) => {
  const token = await user.getIdToken()

  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Unable to load user profile.')
  }

  return data.user
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  const initialAuthCheck = useRef(true)

  useEffect(() => {
    let active = true

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return

      setCurrentUser(user)

      if (initialAuthCheck.current) {
        initialAuthCheck.current = false

        if (!user) {
          setLoading(false)
          return
        }

        setLoading(true)

        try {
          const profile = await syncWithBackend(user)

          if (active) {
            setUserProfile(profile)
            setProfileError('')
          }
        } catch (error) {
          if (active) {
            setProfileError(error.message)
            setUserProfile(null)
          }
        } finally {
          if (active) setLoading(false)
        }

        return
      }

      if (!user) {
        setUserProfile(null)
        setProfileError('')
        setLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const syncUserProfile = async (user) => {
    const profile = await syncWithBackend(user)
    setUserProfile(profile)
    setProfileError('')
    return profile
  }

  const register = async (name, email, password) => {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    )

    await updateProfile(result.user, {
      displayName: name,
    })

    setCurrentUser(result.user)
    setLoading(true)

    try {
      await syncUserProfile(result.user)
      return result.user
    } catch (error) {
      setProfileError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    )

    setCurrentUser(result.user)
    setLoading(true)

    try {
      await syncUserProfile(result.user)
      return result.user
    } catch (error) {
      setProfileError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await signOut(auth)
    setCurrentUser(null)
    setUserProfile(null)
    setProfileError('')
  }

  const getIdToken = async () => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user found.')
    }

    return auth.currentUser.getIdToken()
  }

  // Update the authenticated user's MongoDB profile.
  const updateUserProfile = async (profileData) => {
    const token = await getIdToken()

    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Unable to update profile.')
    }

    setUserProfile(data.user)
    setProfileError('')

    return data.user
  }

  const retryProfileSync = async () => {
    if (!auth.currentUser) return

    setLoading(true)

    try {
      await syncUserProfile(auth.currentUser)
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    currentUser,
    userProfile,
    loading,
    profileError,
    register,
    login,
    logout,
    getIdToken,
    syncUserProfile,
    updateUserProfile,
    retryProfileSync,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}