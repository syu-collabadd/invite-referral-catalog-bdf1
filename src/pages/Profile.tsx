import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile as ProfileType, UserRole } from '../types'
import Layout from '../components/Layout'
import { User, Shield, TrendingUp, Truck, Users, ChevronRight, Calendar, Mail } from 'lucide-react'

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'text-purple-700', bg: 'bg-purple-100' },
  wholesale: { label: 'Wholesale', icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-100' },
  distributor: { label: 'Distributor', icon: Truck, color: 'text-orange-700', bg: 'bg-orange-100' },
  member: { label: 'Member', icon: User, color: 'text-slate-700', bg: 'bg-slate-100' },
}

function localDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Profile() {
  const { profile } = useAuth()
  const [invitedBy, setInvitedBy] = useState<ProfileType | null>(null)
  const [referrals, setReferrals] = useState<ProfileType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function load() {
      const tasks: Promise<void>[] = []

      if (profile!.invited_by) {
        tasks.push(
          Promise.resolve(
            supabase.from('profiles').select('*').eq('id', profile!.invited_by).single().then(({ data }) => {
              setInvitedBy(data)
            })
          )
        )
      }

      tasks.push(
        Promise.resolve(
          supabase.from('profiles').select('*').eq('invited_by', profile!.id).order('created_at').then(({ data }) => {
            setReferrals(data ?? [])
          })
        )
      )

      await Promise.all(tasks)
      setLoading(false)
    }
    load()
  }, [profile])

  if (!profile) return null

  const rc = roleConfig[profile.role]
  const RoleIcon = rc.icon

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-white text-2xl font-bold">
                {(profile.full_name ?? profile.email)[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">{profile.full_name ?? 'No name set'}</h1>
              <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
                <Mail size={13} />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${rc.bg}`}>
                  <RoleIcon size={13} className={rc.color} />
                  <span className={`text-xs font-semibold ${rc.color}`}>{rc.label}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <Calendar size={12} />
                  Joined {localDate(profile.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Referral lineage */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Invited by */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <ChevronRight size={15} className="text-slate-400" />
              Invited By
            </h2>
            {loading ? (
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ) : invitedBy ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                  {(invitedBy.full_name ?? invitedBy.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 text-sm truncate">{invitedBy.full_name ?? invitedBy.email}</div>
                  <div className="text-xs text-slate-400 capitalize">{invitedBy.role}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No referrer (direct registration)</p>
            )}
          </div>

          {/* You invited */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users size={15} className="text-slate-400" />
              You've Invited
              {referrals.length > 0 && (
                <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {referrals.length}
                </span>
              )}
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}
              </div>
            ) : referrals.length === 0 ? (
              <p className="text-sm text-slate-400">You haven't invited anyone yet</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {referrals.map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {(r.full_name ?? r.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{r.full_name ?? r.email}</div>
                    </div>
                    <span className={`shrink-0 text-xs capitalize px-1.5 py-0.5 rounded-full ${roleConfig[r.role].bg} ${roleConfig[r.role].color}`}>
                      {r.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pricing info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Your Pricing Tier</h2>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${rc.bg}`}>
            <RoleIcon size={20} className={rc.color} />
            <div>
              <div className={`font-semibold ${rc.color}`}>{rc.label} Pricing</div>
              <div className={`text-xs ${rc.color} opacity-80`}>
                {profile.role === 'wholesale' && 'Best volume pricing for bulk orders'}
                {profile.role === 'distributor' && 'Competitive pricing for distribution'}
                {profile.role === 'member' && 'Standard member pricing'}
                {profile.role === 'admin' && 'Full visibility across all pricing tiers'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
