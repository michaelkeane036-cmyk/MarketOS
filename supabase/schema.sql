create extension if not exists "pgcrypto";

create type public.marketos_member_role as enum ('owner', 'manager', 'staff');
create type public.marketos_record_status as enum (
  'draft',
  'recorded',
  'evidence_attached',
  'customer_confirmed',
  'externally_verified'
);
create type public.marketos_record_kind as enum ('sale', 'expense', 'stock', 'debt');
create type public.marketos_payment_method as enum ('cash', 'transfer', 'pos', 'credit');
create type public.marketos_scan_source as enum ('camera', 'upload', 'manual_upload');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  business_type text not null default 'Small business',
  location text,
  currency text not null default 'NGN',
  operating_note text not null default 'No wallet - records only',
  setup_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.marketos_member_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  stock numeric(14, 2) not null default 0,
  reorder_point numeric(14, 2) not null default 0,
  unit text not null default 'items',
  unit_cost numeric(14, 2) not null default 0,
  selling_price numeric(14, 2) not null default 0,
  icon_label text,
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null default 'Walk-in customer',
  total numeric(14, 2) not null default 0,
  profit numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  balance_owed numeric(14, 2) not null default 0,
  payment_method public.marketos_payment_method not null default 'cash',
  payment_status text not null default 'paid',
  record_status public.marketos_record_status not null default 'recorded',
  source text not null default 'manual',
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  quantity numeric(14, 2) not null default 1,
  unit_price numeric(14, 2) not null default 0,
  unit_cost numeric(14, 2) not null default 0
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null,
  amount numeric(14, 2) not null default 0,
  category text not null default 'Operations',
  payment_method public.marketos_payment_method not null default 'cash',
  record_status public.marketos_record_status not null default 'recorded',
  source text not null default 'manual',
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  amount numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  last_activity text,
  record_status public.marketos_record_status not null default 'recorded',
  source_record_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  movement_type text not null default 'in',
  quantity numeric(14, 2) not null default 0,
  unit text not null default 'items',
  unit_cost numeric(14, 2) not null default 0,
  note text,
  record_status public.marketos_record_status not null default 'recorded',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.transaction_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  record_type public.marketos_record_kind not null,
  record_id uuid not null,
  source public.marketos_scan_source not null,
  image_path text,
  file_name text,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.scan_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_path text,
  source public.marketos_scan_source not null,
  extracted_summary text,
  entry_type public.marketos_record_kind not null default 'sale',
  status public.marketos_record_status not null default 'draft',
  reviewed_record_type public.marketos_record_kind,
  reviewed_record_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  record_type public.marketos_record_kind,
  record_id uuid,
  message text not null,
  amount numeric(14, 2),
  record_status public.marketos_record_status not null default 'recorded',
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketos-evidence',
  'marketos-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expenses enable row level security;
alter table public.debts enable row level security;
alter table public.stock_movements enable row level security;
alter table public.transaction_evidence enable row level security;
alter table public.scan_drafts enable row level security;
alter table public.activity_log enable row level security;

create or replace function public.is_marketos_business_member(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members members
    where members.business_id = target_business_id
      and members.user_id = auth.uid()
  );
$$;

create policy "business owner can manage businesses"
on public.businesses
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "members can read their business"
on public.businesses
for select
using (public.is_marketos_business_member(id));

create policy "owners and members can manage membership"
on public.business_members
for all
using (
  public.is_marketos_business_member(business_id)
  or exists (
    select 1
    from public.businesses businesses
    where businesses.id = business_id
      and businesses.owner_id = auth.uid()
  )
)
with check (
  public.is_marketos_business_member(business_id)
  or exists (
    select 1
    from public.businesses businesses
    where businesses.id = business_id
      and businesses.owner_id = auth.uid()
  )
);

create policy "members can manage customers"
on public.customers
for all
using (public.is_marketos_business_member(business_id))
with check (public.is_marketos_business_member(business_id));

create policy "members can manage products"
on public.products
for all
using (public.is_marketos_business_member(business_id))
with check (public.is_marketos_business_member(business_id));

create policy "members can manage sales"
on public.sales
for all
using (public.is_marketos_business_member(business_id))
with check (public.is_marketos_business_member(business_id));

create policy "members can manage sale items"
on public.sale_items
for all
using (
  exists (
    select 1
    from public.sales sales
    where sales.id = sale_id
      and public.is_marketos_business_member(sales.business_id)
  )
)
with check (
  exists (
    select 1
    from public.sales sales
    where sales.id = sale_id
      and public.is_marketos_business_member(sales.business_id)
  )
);

create policy "members can manage expenses"
on public.expenses
for all
using (public.is_marketos_business_member(business_id))
with check (public.is_marketos_business_member(business_id));

create policy "members can manage debts"
on public.debts
for all
using (public.is_marketos_business_member(business_id))
with check (public.is_marketos_business_member(business_id));

create policy "members can manage stock movements"
on public.stock_movements
for all
using (public.is_marketos_business_member(business_id))
with check (public.is_marketos_business_member(business_id));

create policy "members can manage evidence"
on public.transaction_evidence
for all
using (public.is_marketos_business_member(business_id))
with check (public.is_marketos_business_member(business_id));

create policy "members can manage scan drafts"
on public.scan_drafts
for all
using (public.is_marketos_business_member(business_id))
with check (public.is_marketos_business_member(business_id));

create policy "members can read activity"
on public.activity_log
for select
using (public.is_marketos_business_member(business_id));

create policy "members can create activity"
on public.activity_log
for insert
with check (public.is_marketos_business_member(business_id));

create policy "members can upload evidence files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'marketos-evidence'
  and public.is_marketos_business_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can read evidence files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'marketos-evidence'
  and public.is_marketos_business_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can update evidence files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'marketos-evidence'
  and public.is_marketos_business_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'marketos-evidence'
  and public.is_marketos_business_member(((storage.foldername(name))[1])::uuid)
);
