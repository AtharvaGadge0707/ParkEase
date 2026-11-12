
import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import {
  Bell,
  CheckCheck,
  Clock,
  CarFront,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function getNotificationIcon(type) {
  if (type === 'VEHICLE_CHECKED_IN') return CarFront
  if (type === 'VEHICLE_CHECKED_OUT') return LogOut
  return Clock
}

function formatNotificationDate(date) {
  if (!date) return ''

  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationCenter() {
  const { currentUser } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const socketRef = useRef(null)
  const seenIdsRef = useRef(new Set())

  // Load saved notifications and establish the authenticated socket.
  useEffect(() => {
    if (!currentUser) {
      seenIdsRef.current.clear()
      return
    }

    let cancelled = false
    let socket

    const initializeNotifications = async () => {
      try {
        const token = await currentUser.getIdToken()

        const data = await apiRequest('/api/notifications', {
          token,
        })

        if (cancelled) return

        const savedNotifications = data.notifications || []

        setNotifications(savedNotifications)
        setUnreadCount(data.unreadCount || 0)

        seenIdsRef.current = new Set(
          savedNotifications.map((item) => item._id),
        )

        socket = io(API_BASE_URL, {
          auth: { token },
        })

        socketRef.current = socket

        socket.on('connect', () => {
          console.log('Notification socket connected.')
        })

        socket.on('connect_error', (error) => {
          console.error('Notification socket error:', error.message)
        })

        socket.on('notification:new', (notification) => {
          if (!notification?._id) return

          if (seenIdsRef.current.has(notification._id)) return

          seenIdsRef.current.add(notification._id)

          setNotifications((previous) =>
            [notification, ...previous].slice(0, 50),
          )

          if (!notification.readAt) {
            setUnreadCount((previous) => previous + 1)
          }

          setToast(notification)
        })
      } catch (error) {
        console.error(
          'Unable to initialize notifications:',
          error.message,
        )
      }
    }

    initializeNotifications()

    return () => {
      cancelled = true
      socket?.disconnect()
      socketRef.current = null
    }
  }, [currentUser])

  // Automatically dismiss toast messages.
  useEffect(() => {
    if (!toast) return undefined

    const timer = setTimeout(() => {
      setToast(null)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast])

  // Mark one notification as read.
  const markAsRead = useCallback(async (notification) => {
    if (notification.readAt) return

    try {
      const token = await currentUser.getIdToken()

      await apiRequest(
        `/api/notifications/${notification._id}/read`,
        {
          method: 'PATCH',
          token,
        },
      )

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      )

      setUnreadCount((previous) => Math.max(0, previous - 1))
    } catch (error) {
      console.error('Unable to mark notification as read:', error.message)
    }
  }, [currentUser])

  // Mark every notification as read.
  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return

    try {
      const token = await currentUser.getIdToken()

      await apiRequest('/api/notifications/read-all', {
        method: 'PATCH',
        token,
      })

      const readAt = new Date().toISOString()

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          readAt: item.readAt || readAt,
        })),
      )

      setUnreadCount(0)
    } catch (error) {
      console.error('Unable to mark all notifications as read:', error.message)
    }
  }, [currentUser, unreadCount])

  return (
    <div className="relative">
      {/* Notification bell */}
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-[340px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:w-[390px]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
            <div>
              <h3 className="font-semibold text-white">
                Notifications
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {unreadCount} unread notification
                {unreadCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="rounded-lg p-2 text-blue-400 transition hover:bg-slate-800"
                >
                  <CheckCheck size={18} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Bell
                  size={30}
                  className="mx-auto mb-3 text-slate-600"
                />
                <p className="text-sm font-medium text-slate-300">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Updates about your parking sessions will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)

                return (
                  <button
                    type="button"
                    key={notification._id}
                    onClick={() => markAsRead(notification)}
                    className={`flex w-full gap-3 border-b border-slate-800 px-4 py-4 text-left transition hover:bg-slate-800/70 ${
                      !notification.readAt ? 'bg-blue-500/5' : ''
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">
                          {notification.title}
                        </p>

                        {!notification.readAt && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-[10px] text-slate-500">
                        {formatNotificationDate(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-slate-800 px-4 py-3">
            <p className="text-center text-[11px] text-slate-500">
              Showing your latest 50 notifications
            </p>
          </div>
        </div>
      )}

      {/* Live toast notification */}
      {toast && (
        <div className="fixed right-4 top-24 z-[100] flex w-[calc(100%-2rem)] max-w-sm gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Bell size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {toast.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="h-fit text-slate-500 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  )
}
