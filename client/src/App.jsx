
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Profile from './pages/Profile'
import Vehicles from './pages/Vehicles'
import Facilities from './pages/Facilities'
import Slots from './pages/Slots'
import ParkingSearch from './pages/Search'
import Bookings from './pages/Bookings'
import Payments from './pages/Payments'
import EntryExit from './pages/EntryExit'
import ActiveSessions from './pages/ActiveSessions'
import StaffDashboard from './pages/StaffDashboard'
import {
  Activity,
  BarChart3,
  Bell,
  CalendarCheck,
  CarFront,
  ClipboardList,
  Clock3,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Menu,
  ParkingCircle,
  ParkingSquare,
  Search,
  Settings,
  Users,
  UserRound,
  X,
} from 'lucide-react'
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import './App.css'

// USER ROLES
const ALL_ROLES = ['Customer', 'Parking Staff', 'Administrator']
const CUSTOMER = ['Customer']
const STAFF = ['Parking Staff', 'Administrator']
const ADMIN = ['Administrator']

// ROLE-BASED NAVIGATION
const navigationGroups = [
  {
    title: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    title: 'CUSTOMER',
    items: [
      {
        label: 'Find Parking',
        path: '/search',
        icon: Search,
        roles: CUSTOMER,
      },
      {
        label: 'Parking Facilities',
        path: '/facilities',
        icon: MapPin,
        roles: ALL_ROLES,
      },
      {
        label: 'Parking Slots',
        path: '/slots',
        icon: ParkingSquare,
        roles: ALL_ROLES,
      },
      {
        label: 'My Vehicles',
        path: '/vehicles',
        icon: CarFront,
        roles: CUSTOMER,
      },
      {
        label: 'My Bookings',
        path: '/bookings',
        icon: CalendarCheck,
        roles: CUSTOMER,
      },
      {
        label: 'Payments',
        path: '/payments',
        icon: CreditCard,
        roles: CUSTOMER,
      },
      {
        label: 'Parking History',
        path: '/history',
        icon: Clock3,
        roles: CUSTOMER,
      },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      {
        label: 'Active Sessions',
        path: '/sessions',
        icon: Activity,
        roles: STAFF,
      },
      {
        label: 'Staff Dashboard',
        path: '/staff',
        icon: ClipboardList,
        roles: STAFF,
      },
      {
        label: 'Entry / Exit',
        path: '/entry-exit',
        icon: ParkingCircle,
        roles: STAFF,
      },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      {
        label: 'User Management',
        path: '/users',
        icon: Users,
        roles: ADMIN,
      },
      {
        label: 'Administration',
        path: '/admin',
        icon: Settings,
        roles: ADMIN,
      },
      {
        label: 'Reports & Analytics',
        path: '/reports',
        icon: BarChart3,
        roles: ADMIN,
      },
      {
        label: 'My Profile',
        path: '/profile',
        icon: UserRound,
        roles: ALL_ROLES,
      },
    ],
  },
]

// PAGE TITLES
const pageTitles = Object.fromEntries(
  navigationGroups.flatMap((group) =>
    group.items.map((item) => [item.path, item.label]),
  ),
)

// SIDEBAR
function Sidebar({ onNavigate, groups }) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-slate-950 text-white">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
          <ParkingCircle size={25} />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-wide">ParkEase</h1>
          <p className="text-xs text-slate-400">Smart Parking System</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-500">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-sm font-semibold">ParkEase Project</p>
          <p className="mt-1 text-xs text-slate-400">
            Smart parking, made simple.
          </p>
        </div>
      </div>
    </aside>
  )
}

// HEADER
function Header({ onMenuClick, title }) {
  const { currentUser, userProfile, logout } = useAuth()

  const displayName =
    userProfile?.name ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'User'

  const userInitial = displayName.charAt(0).toUpperCase()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={23} />
        </button>

        <div>
          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
            {title}
          </h2>
          <p className="hidden text-xs text-slate-500 sm:block">
            Smart Parking Management System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
            {userInitial}
          </div>

          <div className="hidden max-w-40 text-left sm:block">
            <p className="truncate text-sm font-semibold text-slate-800">
              {displayName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {currentUser?.email}
            </p>
            <p className="text-xs font-medium text-blue-600">
              {userProfile?.role}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

// DASHBOARD
function Dashboard() {
  const { userProfile } = useAuth()
  const isCustomer = userProfile?.role === 'Customer'

  const overviewCards = [
    {
      title: 'My Vehicles',
      icon: CarFront,
      description: 'Your registered vehicles',
    },
    {
      title: 'My Bookings',
      icon: CalendarCheck,
      description: 'Your parking reservations',
    },
    {
      title: 'Parking Facilities',
      icon: MapPin,
      description: 'Facilities available on ParkEase',
    },
    {
      title: 'Active Sessions',
      icon: Activity,
      description: 'Your ongoing parking sessions',
    },
  ]

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-9">
        <p className="mb-2 text-sm font-medium text-blue-100">
          SMART PARKING MANAGEMENT
        </p>

        <h2 className="text-2xl font-bold sm:text-3xl">
          Welcome to ParkEase!
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
          Find convenient parking, manage your vehicles and keep track of
          your reservations — all in one place.
        </p>

        {isCustomer && (
          <NavLink
            to="/search"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <Search size={17} />
            Find Parking
          </NavLink>
        )}
      </section>

      <section>
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-800">
            Dashboard Overview
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Your ParkEase activity at a glance.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => {
            const Icon = card.icon

            return (
              <div
                key={card.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon size={22} />
                </div>

                <p className="mt-5 text-sm font-semibold text-slate-700">
                  {card.title}
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-300">
                  —
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {card.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-bold text-slate-800">Getting Started</h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your dashboard layout is ready. Vehicle registration, parking
          availability, reservations and other features will be connected
          in their respective development phases.
        </p>
      </section>
    </div>
  )
}

// PLACEHOLDER PAGE
function PlaceholderPage({ title }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <ParkingCircle size={25} />
      </div>

      <h2 className="text-xl font-bold text-slate-800">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        This module will be implemented in its designated development phase.
        The navigation route is ready.
      </p>
    </section>
  )
}

// ROLE-BASED ROUTE GUARD
function RoleGuard({ allowedRoles, children }) {
  const { userProfile } = useAuth()

  if (!allowedRoles.includes(userProfile?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

// UNAUTHORIZED PAGE
function UnauthorizedPage() {
  return (
    <section className="rounded-xl border border-red-200 bg-white p-8">
      <h2 className="text-xl font-bold text-red-600">
        Access Denied
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        You do not have permission to access this page.
      </p>

      <NavLink
        to="/"
        className="mt-4 inline-block text-blue-600 hover:underline"
      >
        Return to Dashboard
      </NavLink>
    </section>
  )
}

// MAIN APPLICATION LAYOUT

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { userProfile } = useAuth()

  const title = pageTitles[location.pathname] || 'Dashboard'

  // Display only navigation items allowed for the current role.
  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.roles.includes(userProfile?.role),
      ),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 h-full shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="absolute right-3 top-6 z-10 rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>

          <Sidebar
            onNavigate={() => setSidebarOpen(false)}
            groups={visibleGroups}
          />
        </div>
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {navigationGroups
              .flatMap((group) => group.items)
              .filter((item) => item.path !== '/')
              .map((item) => (
                <Route
                  key={item.path}
                  path={item.path}
                  element={
                    <RoleGuard allowedRoles={item.roles}>
                      {item.path === '/vehicles' ? (
                        <Vehicles />
                      ) : item.path === '/profile' ? (
                        <Profile />
                      ) : item.path === '/facilities' ? (
                        <Facilities />
                      ) : item.path === '/slots' ? (
                        <Slots />
                      ) : item.path === '/search' ? (
                        <ParkingSearch />
                      ) : item.path === '/bookings' ? (
                        <Bookings />
                      ) : item.path === '/payments' ? (
                        <Payments />
                      ) : item.path === '/entry-exit' ? (
                        <EntryExit />
                      ) : item.path === '/sessions' ? (
                        <ActiveSessions />
                      ) :  item.path === '/staff' ? (
                        <StaffDashboard />
                      ) : (
                        <PlaceholderPage title={item.label} />
                      )}
                    </RoleGuard>
                  }
                />
              ))}

            <Route
              path="/unauthorized"
              element={<UnauthorizedPage />}
            />

            <Route
              path="*"
              element={<PlaceholderPage title="Page Not Found" />}
            />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 bg-white px-5 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} ParkEase. Smart Parking Management
          System.
        </footer>
      </div>
    </div>
  )
}


// AUTHENTICATION AND PROFILE PROTECTION
function ProtectedLayout() {
  const {
    currentUser,
    userProfile,
    loading,
    profileError,
    retryProfileSync,
    logout,
  } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading ParkEase...
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (profileError || !userProfile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-center text-red-600">
          {profileError || 'Unable to load your user profile.'}
        </p>

        <button
          type="button"
          onClick={retryProfileSync}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>

        <button
          type="button"
          onClick={logout}
          className="text-sm text-slate-600 hover:text-red-600"
        >
          Logout
        </button>
      </div>
    )
  }

  return <AppLayout />
}

// ROOT APP
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
