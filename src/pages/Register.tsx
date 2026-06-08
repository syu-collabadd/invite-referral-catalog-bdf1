import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Package, CheckCircle } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'invite' | 'register'>('invite')
  const [inviteData, setInviteData] = useState<{ id: string; assigned_role: string; created_by: string } | null>(null)

  async function validateInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, assigned_role, created_by, used_by, expires_at')
      .eq('code', inviteCode.trim().toUpperCase())
      .single()

    if (error || !data) {
      setError('Invalid invite code. Please check and try again.')
    } else if (data.used_by) {
      setError('This invite code has already been used.')
    } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setError('This invite code has expired.')
    } else {
      setInviteData(data)
      setStep('register')
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteData) return
    setError('')
    setLoading(true)

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: inviteData.assigned_role,
          invited_by: inviteData.created_by,
          invite_code_id: inviteData.id,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      // Mark invite code as used
      await supabase
        .from('invite_codes')
        .update({ used_by: authData.user.id, used_at: new Date().toISOString() })
        .eq('id', inviteData.id)

      navigate('/catalogue')
    }
    setLoading(false)
  }

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    wholesale: 'Wholesale',
    distributor: 'Distributor',
    member: 'Member',
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="text-white" size={20} />
            </div>
            <span className="text-xl font-semibold text-slate-900">CatalogPro</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {step === 'invite' ? (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">Create account</h1>
              <p className="text-slate-500 text-sm mb-6">Enter your invite code to get started</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={validateInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    required
                    placeholder="XXXXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !inviteCode.trim()}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Validating…' : 'Validate Code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="text-green-600 shrink-0" size={16} />
                <span className="text-sm text-green-800">
                  Valid code — you'll be registered as{' '}
                  <strong>{roleLabels[inviteData?.assigned_role ?? ''] ?? inviteData?.assigned_role}</strong>
                </span>
              </div>

              <h1 className="text-2xl font-semibold text-slate-900 mb-1">Complete registration</h1>
              <p className="text-slate-500 text-sm mb-6">Set up your account details</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
