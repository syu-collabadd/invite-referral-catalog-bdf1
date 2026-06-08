export type UserRole = 'admin' | 'wholesale' | 'distributor' | 'member'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  invited_by: string | null
  created_at: string
}

export interface InviteCode {
  id: string
  code: string
  created_by: string
  assigned_role: UserRole
  used_by: string | null
  used_at: string | null
  created_at: string
  expires_at: string | null
}

export interface Product {
  id: string
  name: string
  description: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
}

export interface PricingTier {
  id: string
  product_id: string
  role: UserRole
  price: number
  volume_min: number
  volume_label: string | null
}

export interface ReferralNode {
  id: string
  full_name: string | null
  email: string
  role: UserRole
  created_at: string
  children?: ReferralNode[]
}
