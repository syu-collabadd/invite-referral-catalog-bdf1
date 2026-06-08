import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile, UserRole } from '../../types'
import AdminLayout from './AdminLayout'
import { Users as UsersIcon, Shield, TrendingUp, Truck, User } from 'lucide-react'

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  wholesale: 'bg-blue-100 text-blue-700',
  distributor: 'bg-orange-100 text-orange-700',
  member: 'bg-slate-100 text-slate-700',
}

const roleIcons: Record<UserRole, React.ElementType> = {
  admin: Shield,
  wholesale: TrendingUp,
  distributor: Truck,
  member: User,
}

function localDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Users() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setUsers(data ?? [])
      setLoading(false)
    })
  }, [])

  async function changeRole(userId: string, newRole: UserRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  const roleCounts = (['admin', 'wholesale', 'distributor', 'member'] as UserRole[]).reduce(
    (acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {} as Record<UserRole, number>
  )

  const filtered = users.filter(u => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <AdminLayout>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['admin', 'wholesale', 'distributor', 'member'] as UserRole[]).map(r => {
          const Icon = roleIcons[r]
          return (
            <div key={r} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-500 capitalize">{r}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{roleCounts[r] ?? 0}</div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="wholesale">Wholesale</option>
          <option value="distributor">Distributor</option>
          <option value="member">Member</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <UsersIcon className="mx-auto text-slate-300 mb-3" size={36} />
              <p className="text-slate-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">User</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Joined</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Invited By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const inviter = users.find(x => x.id === u.invited_by)
                    return (
                      <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{u.full_name ?? '—'}</div>
                          <div className="text-slate-400 text-xs">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={e => changeRole(u.id, e.target.value as UserRole)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${roleColors[u.role]}`}
                          >
                            <option value="admin">Admin</option>
                            <option value="wholesale">Wholesale</option>
                            <option value="distributor">Distributor</option>
                            <option value="member">Member</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{localDate(u.created_at)}</td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell text-xs">
                          {inviter ? (inviter.full_name ?? inviter.email) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
