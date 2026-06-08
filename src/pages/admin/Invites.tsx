import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { InviteCode, UserRole } from '../../types'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { Plus, Copy, Check, Ticket, Link } from 'lucide-react'

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  wholesale: 'bg-blue-100 text-blue-700',
  distributor: 'bg-orange-100 text-orange-700',
  member: 'bg-slate-100 text-slate-700',
}

function localDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Invites() {
  const { profile } = useAuth()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newRole, setNewRole] = useState<UserRole>('member')
  const [expiresAt, setExpiresAt] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const BASE = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')

  useEffect(() => {
    supabase.from('invite_codes').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setCodes(data ?? [])
      setLoading(false)
    })
  }, [])

  async function createCode() {
    if (!profile) return
    setCreating(true)
    const code = generateCode()
    const { data, error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        created_by: profile.id,
        assigned_role: newRole,
        expires_at: expiresAt || null,
      })
      .select()
      .single()
    if (!error && data) setCodes(prev => [data, ...prev])
    setCreating(false)
    setShowForm(false)
    setExpiresAt('')
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(`${BASE}/register?code=${code}`)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied('c-' + code)
    setTimeout(() => setCopied(null), 2000)
  }

  const unused = codes.filter(c => !c.used_by).length

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Invite Codes</h2>
          <p className="text-slate-500 text-sm">{unused} unused of {codes.length} total</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Generate Code
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-3">New Invite Code</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Assign Role</label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as UserRole)}
                className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="member">Member</option>
                <option value="distributor">Distributor</option>
                <option value="wholesale">Wholesale</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Expires (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={createCode}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Generating…' : 'Generate'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Ticket className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">No invite codes yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Code</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {codes.map(c => (
                  <tr key={c.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 ${c.used_by ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">{c.code}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${roleColors[c.assigned_role]}`}>
                        {c.assigned_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {c.used_by ? (
                        <span className="text-xs text-slate-400">Used {c.used_at ? localDate(c.used_at) : ''}</span>
                      ) : (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Available</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell text-xs">
                      {c.expires_at ? localDate(c.expires_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {!c.used_by && (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => copyCode(c.code)} title="Copy code"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            {copied === 'c-' + c.code ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                          </button>
                          <button onClick={() => copyLink(c.code)} title="Copy invite link"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            {copied === c.code ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
