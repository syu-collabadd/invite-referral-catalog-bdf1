import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Product, PricingTier, UserRole } from '../types'
import { Package, Search, ShoppingBag } from 'lucide-react'
import Layout from '../components/Layout'

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  wholesale: 'Wholesale',
  distributor: 'Distributor',
  member: 'Member',
}

const roleColors: Record<UserRole, string> = {
  admin: 'text-purple-600',
  wholesale: 'text-blue-600',
  distributor: 'text-orange-600',
  member: 'text-slate-600',
}

function PriceDisplay({ tiers, role }: { tiers: PricingTier[]; role: UserRole }) {
  const myTiers = tiers.filter(t => t.role === role || role === 'admin')
  if (myTiers.length === 0) return <span className="text-slate-400 text-sm">No pricing set</span>

  if (role === 'admin') {
    // Admin sees all tiers
    const grouped = ['wholesale', 'distributor', 'member'].map(r => ({
      role: r as UserRole,
      tiers: tiers.filter(t => t.role === r).sort((a, b) => a.volume_min - b.volume_min),
    })).filter(g => g.tiers.length > 0)

    return (
      <div className="space-y-2">
        {grouped.map(({ role: r, tiers: rt }) => (
          <div key={r}>
            <span className={`text-xs font-medium uppercase tracking-wide ${roleColors[r]}`}>{roleLabels[r]}</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {rt.map(t => (
                <span key={t.id} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {t.volume_label ?? `${t.volume_min}+`}: <strong>${t.price.toFixed(2)}</strong>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const sorted = myTiers.sort((a, b) => a.volume_min - b.volume_min)
  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map(t => (
        <div key={t.id} className="text-center">
          <div className="text-lg font-bold text-slate-900">${t.price.toFixed(2)}</div>
          {t.volume_label && <div className="text-xs text-slate-400">{t.volume_label}</div>}
        </div>
      ))}
    </div>
  )
}

export default function Catalogue() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: tierData }] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('pricing_tiers').select('*'),
      ])
      setProducts(prods ?? [])
      setTiers(tierData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (!profile) return null

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Product Catalogue</h1>
            <p className="text-slate-500 text-sm mt-1">
              Prices shown for your{' '}
              <span className={`font-medium ${roleColors[profile.role]}`}>
                {roleLabels[profile.role]}
              </span>{' '}
              tier
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-48 bg-slate-100" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <ShoppingBag className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 font-medium">No products found</p>
          {search && <p className="text-slate-400 text-sm mt-1">Try a different search term</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(product => {
            const productTiers = tiers.filter(t => t.product_id === product.id)
            return (
              <div key={product.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="text-slate-300" size={48} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 text-base mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{product.description}</p>
                  )}
                  <div className="border-t border-slate-100 pt-3">
                    <PriceDisplay tiers={productTiers} role={profile.role} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
