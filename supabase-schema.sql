-- ============================================================
-- CatalogPro — Supabase Schema
-- Run this in your Supabase SQL editor (Project → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User roles enum
create type user_role as enum ('admin', 'wholesale', 'distributor', 'member');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'member',
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table profiles enable row level security;

-- Anyone authenticated can read all profiles (needed for referral tree)
create policy "authenticated users can read profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Users can update their own profile
create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Admin can update any profile (role changes)
create policy "admin can update any profile"
  on profiles for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Profiles are inserted via the trigger below (not directly)
create policy "system can insert profiles"
  on profiles for insert
  with check (id = auth.uid());

-- Trigger: auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role, invited_by)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'member')::user_role,
    (new.raw_user_meta_data->>'invited_by')::uuid
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- INVITE CODES
-- ============================================================
create table invite_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  created_by uuid not null references profiles(id) on delete cascade,
  assigned_role user_role not null default 'member',
  used_by uuid references profiles(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now() not null
);

alter table invite_codes enable row level security;

-- Anyone can read invite codes (needed for validation on register page)
create policy "anyone can read invite codes"
  on invite_codes for select
  using (true);

-- Authenticated users can insert invite codes
create policy "authenticated users can create invite codes"
  on invite_codes for insert
  with check (auth.role() = 'authenticated');

-- Authenticated users can update (mark as used)
create policy "authenticated users can update invite codes"
  on invite_codes for update
  using (auth.role() = 'authenticated');

-- Admin can delete invite codes
create policy "admin can delete invite codes"
  on invite_codes for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- PRODUCTS
-- ============================================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz default now() not null
);

alter table products enable row level security;

-- All authenticated users can read active products
create policy "authenticated users can read active products"
  on products for select
  using (auth.role() = 'authenticated' and is_active = true);

-- Admins can read all products (including inactive)
create policy "admin can read all products"
  on products for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Only admin can insert/update/delete products
create policy "admin can insert products"
  on products for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin can update products"
  on products for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin can delete products"
  on products for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- PRICING TIERS
-- ============================================================
create table pricing_tiers (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  role user_role not null,
  price numeric(10, 2) not null check (price >= 0),
  volume_min integer not null default 1 check (volume_min >= 1),
  volume_label text,
  unique (product_id, role, volume_min)
);

alter table pricing_tiers enable row level security;

-- All authenticated users can read pricing tiers
create policy "authenticated users can read pricing"
  on pricing_tiers for select
  using (auth.role() = 'authenticated');

-- Only admin can modify pricing
create policy "admin can insert pricing"
  on pricing_tiers for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin can update pricing"
  on pricing_tiers for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin can delete pricing"
  on pricing_tiers for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- SEED: First admin invite code
-- Run after creating your first Supabase auth user manually,
-- then update the 'created_by' UUID below.
-- ============================================================
-- insert into invite_codes (code, created_by, assigned_role)
-- values ('ADMIN00001', '<your-admin-user-uuid>', 'admin');
