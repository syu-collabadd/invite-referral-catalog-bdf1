import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile, UserRole } from '../../types'
import AdminLayout from './AdminLayout'
import { GitBranch, ChevronDown, ChevronRight, Users } from 'lucide-react'

interface TreeNode extends Profile {
  children: TreeNode[]
  depth: number
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  wholesale: 'bg-blue-100 text-blue-700 border-blue-200',
  distributor: 'bg-orange-100 text-orange-700 border-orange-200',
  member: 'bg-slate-100 text-slate-700 border-slate-200',
}

const depthColors = ['border-l-blue-400', 'border-l-purple-400', 'border-l-orange-400', 'border-l-green-400', 'border-l-pink-400']

function buildTree(users: Profile[], parentId: string | null, depth = 0): TreeNode[] {
  return users
    .filter(u => u.invited_by === parentId)
    .map(u => ({
      ...u,
      depth,
      children: buildTree(users, u.id, depth + 1),
    }))
}

function NodeCard({ node, expanded, onToggle }: { node: TreeNode; expanded: boolean; onToggle: () => void }) {
  const hasChildren = node.children.length > 0
  return (
    <div className={`flex items-start gap-2 py-1`}>
      <button
        onClick={hasChildren ? onToggle : undefined}
        className={`mt-1 p-0.5 rounded transition-colors ${hasChildren ? 'text-slate-400 hover:text-slate-600 cursor-pointer' : 'text-transparent cursor-default'}`}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="shrink-0 w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
          {(node.full_name ?? node.email)[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-slate-900 text-sm truncate">{node.full_name ?? node.email}</div>
          <div className="text-slate-400 text-xs truncate">{node.email}</div>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border capitalize ml-auto ${roleColors[node.role]}`}>
          {node.role}
        </span>
        {hasChildren && (
          <span className="shrink-0 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
            {node.children.length}
          </span>
        )}
      </div>
    </div>
  )
}

function TreeBranch({ nodes }: { nodes: TreeNode[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(nodes.map(n => n.id)))

  function toggle(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (nodes.length === 0) return null

  return (
    <div className="space-y-0">
      {nodes.map(node => (
        <div key={node.id}>
          <NodeCard node={node} expanded={expandedIds.has(node.id)} onToggle={() => toggle(node.id)} />
          {expandedIds.has(node.id) && node.children.length > 0 && (
            <div className={`ml-6 pl-3 border-l-2 ${depthColors[node.depth % depthColors.length]} my-0.5`}>
              <TreeBranch nodes={node.children} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ReferralTree() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at').then(({ data }) => {
      setUsers(data ?? [])
      setLoading(false)
    })
  }, [])

  // Roots = users with no inviter OR inviter not in our list
  const ids = new Set(users.map(u => u.id))
  const roots = users.filter(u => !u.invited_by || !ids.has(u.invited_by))

  const filteredRoots = search
    ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()))
    : roots

  const fullTree = buildTree(users, null)

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Referral Tree</h2>
          <p className="text-slate-500 text-sm">{users.length} total users, {roots.length} root{roots.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="sm:ml-auto">
          <input
            type="text"
            placeholder="Search user…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-60"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['admin', 'wholesale', 'distributor', 'member'] as UserRole[]).map(r => (
          <div key={r} className={`rounded-xl border p-3 ${roleColors[r]}`}>
            <div className="text-xs font-medium capitalize mb-1">{r}</div>
            <div className="text-xl font-bold">{users.filter(u => u.role === r).length}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <GitBranch className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">No users yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          {search ? (
            filteredRoots.length === 0 ? (
              <div className="text-center py-10">
                <Users className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-500 text-sm">No matching users</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRoots.map(u => {
                  const node = fullTree.find(n => n.id === u.id) ?? {
                    ...u, depth: 0, children: buildTree(users, u.id, 1)
                  }
                  return <TreeBranch key={u.id} nodes={[node as TreeNode]} />
                })}
              </div>
            )
          ) : (
            <TreeBranch nodes={fullTree} />
          )}
        </div>
      )}
    </AdminLayout>
  )
}
