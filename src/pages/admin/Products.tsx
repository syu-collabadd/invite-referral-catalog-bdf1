import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Product, PricingTier, UserRole } from '../../types'
import AdminLayout from './AdminLayout'
import { Plus, Pencil, Trash2, Package, X, Check } from 'lucide-react'

const ROLES: UserRole[] = ['wholesale', 'distributor', 'member']

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  wholesale: 'Wholesale',
  distributor: 'Distributor',
  member: 'Member',
}

interface TierInput {
  role: UserRole
  price: string
  volume_min: string
  volume_label: string
}

function defaultTiers(): TierInput[] {
  return ROLES.map(r => ({ role: r, price: '', volume_min: '1', volume_label: '' }))
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [tierInputs, setTierInputs] = useState<TierInput[]>(defaultTiers())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [{ data: prods }, { data: tierData }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('pricing_tiers').select('*'),
    ])
    setProducts(prods ?? [])
    setTiers(tierData ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setName('')
    setDescription('')
    setImageUrl('')
    setIsActive(true)
    setTierInputs(defaultTiers())
    setError('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setName(p.name)
    setDescription(p.description ?? '')
    setImageUrl(p.image_url ?? '')
    setIsActive(p.is_active)
    const existing = tiers.filter(t => t.product_id === p.id)
    setTierInputs(ROLES.map(r => {
      const t = existing.find(x => x.role === r)
      return {
        role: r,
        price: t ? String(t.price) : '',
        volume_min: t ? String(t.volume_min) : '1',
        volume_label: t?.volume_label ?? '',
      }
    }))
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let productId: string

      if (editing) {
        const { error } = await supabase
          .from('products')
          .update({ name, description: description || null, image_url: imageUrl || null, is_active: isActive })
          .eq('id', editing.id)
        if (error) throw error
        productId = editing.id
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({ name, description: description || null, image_url: imageUrl || null, is_active: isActive })
          .select()
          .single()
        if (error) throw error
        productId = data.id
      }

      // Upsert pricing tiers
      if (editing) {
        await supabase.from('pricing_tiers').delete().eq('product_id', productId)
      }
      const validTiers = tierInputs.filter(t => t.price !== '')
      if (validTiers.length > 0) {
        const { error } = await supabase.from('pricing_tiers').insert(
          validTiers.map(t => ({
            product_id: productId,
            role: t.role,
            price: parseFloat(t.price),
            volume_min: parseInt(t.volume_min) || 1,
            volume_label: t.volume_label || null,
          }))
        )
        if (error) throw error
      }

      await load()
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product and all its pricing?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(p => p.filter(x => x.id !== id))
    setTiers(t => t.filter(x => x.product_id !== id))
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Products ({products.length})</h2>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Package className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500 font-medium">No products yet</p>
          <button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">
            Add your first product
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Product</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Pricing (W / D / M)</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const ptiers = tiers.filter(t => t.product_id === p.id)
                const priceStr = ROLES.map(r => {
                  const t = ptiers.find(x => x.role === r)
                  return t ? `$${t.price.toFixed(2)}` : '—'
                }).join(' / ')
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <Package size={18} className="text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{p.name}</div>
                          {p.description && <div className="text-slate-400 text-xs truncate max-w-xs">{p.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell font-mono text-xs">{priceStr}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.is_active ? <Check size={11} /> : <X size={11} />}
                        {p.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-8 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">{editing ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} type="url"
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                  className="rounded" />
                <label htmlFor="isActive" className="text-sm text-slate-700">Active (visible to users)</label>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Pricing by Role</p>
                <div className="space-y-2">
                  {tierInputs.map((t, i) => (
                    <div key={t.role} className="grid grid-cols-3 gap-2 items-center">
                      <span className="text-sm font-medium text-slate-600">{roleLabels[t.role]}</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Price"
                          value={t.price}
                          onChange={e => setTierInputs(prev => prev.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                          className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Label (e.g. 1-10 units)"
                        value={t.volume_label}
                        onChange={e => setTierInputs(prev => prev.map((x, j) => j === i ? { ...x, volume_label: e.target.value } : x))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
