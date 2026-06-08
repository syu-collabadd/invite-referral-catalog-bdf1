import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Package, LayoutGrid, User, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  wholesale: 'bg-blue-100 text-blue-700',
  distributor: 'bg-orange-100 text-orange-700',
  member: 'bg-slate-100 text-slate-700',
}

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { to: '/catalogue', label: 'Catalogue', icon: LayoutGrid },
    { to: '/profile', label: 'My Profile', icon: User },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Settings }] : []),
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/catalogue" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="text-white" size={16} />
              </div>
              <span className="text-lg font-semibold text-slate-900 hidden sm:block">CatalogPro</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith(to)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {profile && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${roleBadgeColors[profile.role]}`}>
                    {profile.role}
                  </span>
                  <span className="text-sm text-slate-600">{profile.full_name ?? profile.email}</span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
              <button
                className="md:hidden p-2 text-slate-400 hover:text-slate-600"
                onClick={() => setMobileOpen(o => !o)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith(to)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            {profile && (
              <div className="px-3 py-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${roleBadgeColors[profile.role]}`}>
                  {profile.role}
                </span>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
