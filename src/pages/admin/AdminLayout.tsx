import type { ReactNode } from 'react'
import { NavLink, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/Layout'
import { Package, Users, Ticket, GitBranch } from 'lucide-react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  if (profile && profile.role !== 'admin') return <Navigate to="/catalogue" replace />

  const tabs = [
    { to: '/admin/products', label: 'Products', icon: Package },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/invites', label: 'Invite Codes', icon: Ticket },
    { to: '/admin/referrals', label: 'Referral Tree', icon: GitBranch },
  ]

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Manage products, users, invites, and referrals</p>
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>

      {children}
    </Layout>
  )
}
