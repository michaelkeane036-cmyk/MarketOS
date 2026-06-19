create extension if not exists "pgcrypto";

do $$
begin
  create type public.marketos_member_role as enum ('owner', 'manager', 'staff');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.marketos_record_status as enum (
    'draft',
    'recorded',
    'evidence_attached',
    'customer_confirmed',
    'externally_verified'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.marketos_record_kind as enum ('sale', 'expense', 'stock', 'debt');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.marketos_payment_method as enum ('cash', 'transfer', 'pos', 'credit');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.marketos_scan_source as enum ('camera', 'upload', 'manual_upload');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.businesses (
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

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.marketos_member_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
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
  created_at timestamptz not null default now(),
  is_void boolean not null default false,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  corrected_by_record_type public.marketos_record_kind,
  corrected_by_record_id uuid
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  quantity numeric(14, 2) not null default 1,
  unit_price numeric(14, 2) not null default 0,
  unit_cost numeric(14, 2) not null default 0
);

create table if not exists public.expenses (
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
  created_at timestamptz not null default now(),
  is_void boolean not null default false,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  corrected_by_record_type public.marketos_record_kind,
  corrected_by_record_id uuid
);

create table if not exists public.debts (
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
  created_at timestamptz not null default now(),
  is_void boolean not null default false,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  corrected_by_record_type public.marketos_record_kind,
  corrected_by_record_id uuid
);

create table if not exists public.stock_movements (
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
  created_at timestamptz not null default now(),
  is_void boolean not null default false,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  corrected_by_record_type public.marketos_record_kind,
  corrected_by_record_id uuid
);

create table if not exists public.transaction_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  record_type public.marketos_record_kind not null,
  record_id uuid not null,
  source public.marketos_scan_source not null,
  image_path text,
  file_name text,
  mime_type text,
  scan_draft_id uuid,
  uploaded_by uuid references auth.users(id) on delete set null,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.scan_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_path text,
  file_name text,
  mime_type text,
  source public.marketos_scan_source not null,
  extracted_summary text,
  entry_type public.marketos_record_kind not null default 'sale',
  status public.marketos_record_status not null default 'draft',
  reviewed_record_type public.marketos_record_kind,
  reviewed_record_id uuid,
  review_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  captured_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
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

alter table public.customers add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.transaction_evidence add column if not exists scan_draft_id uuid;
alter table public.scan_drafts add column if not exists file_name text;
alter table public.scan_drafts add column if not exists mime_type text;
alter table public.scan_drafts add column if not exists review_note text;
alter table public.scan_drafts add column if not exists captured_at timestamptz;
alter table public.scan_drafts add column if not exists updated_at timestamptz not null default now();

alter table public.sales add column if not exists is_void boolean not null default false;
alter table public.sales add column if not exists void_reason text;
alter table public.sales add column if not exists voided_at timestamptz;
alter table public.sales add column if not exists voided_by uuid references auth.users(id) on delete set null;
alter table public.sales add column if not exists corrected_by_record_type public.marketos_record_kind;
alter table public.sales add column if not exists corrected_by_record_id uuid;

alter table public.expenses add column if not exists is_void boolean not null default false;
alter table public.expenses add column if not exists void_reason text;
alter table public.expenses add column if not exists voided_at timestamptz;
alter table public.expenses add column if not exists voided_by uuid references auth.users(id) on delete set null;
alter table public.expenses add column if not exists corrected_by_record_type public.marketos_record_kind;
alter table public.expenses add column if not exists corrected_by_record_id uuid;

alter table public.debts add column if not exists is_void boolean not null default false;
alter table public.debts add column if not exists void_reason text;
alter table public.debts add column if not exists voided_at timestamptz;
alter table public.debts add column if not exists voided_by uuid references auth.users(id) on delete set null;
alter table public.debts add column if not exists corrected_by_record_type public.marketos_record_kind;
alter table public.debts add column if not exists corrected_by_record_id uuid;

alter table public.stock_movements add column if not exists is_void boolean not null default false;
alter table public.stock_movements add column if not exists void_reason text;
alter table public.stock_movements add column if not exists voided_at timestamptz;
alter table public.stock_movements add column if not exists voided_by uuid references auth.users(id) on delete set null;
alter table public.stock_movements add column if not exists corrected_by_record_type public.marketos_record_kind;
alter table public.stock_movements add column if not exists corrected_by_record_id uuid;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketos-evidence',
  'marketos-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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

create index if not exists businesses_owner_created_idx on public.businesses (owner_id, created_at desc);
create index if not exists business_members_user_idx on public.business_members (user_id, business_id);
create index if not exists customers_business_created_idx on public.customers (business_id, created_at desc);
create index if not exists customers_business_lower_name_idx on public.customers (business_id, lower(name));
create index if not exists products_business_created_idx on public.products (business_id, created_at desc);
create index if not exists products_business_lower_name_idx on public.products (business_id, lower(name));
create index if not exists products_business_stock_idx on public.products (business_id, stock, reorder_point);
create index if not exists sales_business_created_idx on public.sales (business_id, created_at desc);
create index if not exists sales_business_occurred_active_idx on public.sales (business_id, occurred_at desc) where is_void = false;
create index if not exists sale_items_sale_idx on public.sale_items (sale_id);
create index if not exists expenses_business_created_idx on public.expenses (business_id, created_at desc);
create index if not exists expenses_business_occurred_active_idx on public.expenses (business_id, occurred_at desc) where is_void = false;
create index if not exists debts_business_created_idx on public.debts (business_id, created_at desc);
create index if not exists debts_business_active_idx on public.debts (business_id, created_at desc) where is_void = false;
create index if not exists stock_movements_business_created_idx on public.stock_movements (business_id, created_at desc);
create index if not exists stock_movements_business_active_idx on public.stock_movements (business_id, created_at desc) where is_void = false;
create index if not exists evidence_business_record_idx on public.transaction_evidence (business_id, record_type, record_id);
create index if not exists scan_drafts_business_status_idx on public.scan_drafts (business_id, status, created_at desc);
create index if not exists activity_log_business_created_idx on public.activity_log (business_id, created_at desc);

create or replace function public.marketos_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketos_touch_businesses on public.businesses;
create trigger marketos_touch_businesses
before update on public.businesses
for each row execute function public.marketos_touch_updated_at();

drop trigger if exists marketos_touch_products on public.products;
create trigger marketos_touch_products
before update on public.products
for each row execute function public.marketos_touch_updated_at();

drop trigger if exists marketos_touch_customers on public.customers;
create trigger marketos_touch_customers
before update on public.customers
for each row execute function public.marketos_touch_updated_at();

drop trigger if exists marketos_touch_scan_drafts on public.scan_drafts;
create trigger marketos_touch_scan_drafts
before update on public.scan_drafts
for each row execute function public.marketos_touch_updated_at();

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

create or replace function public.marketos_payload_number(source_payload jsonb, key_name text, fallback_value numeric default 0)
returns numeric
language sql
immutable
as $$
  select coalesce(
    nullif(regexp_replace(coalesce(source_payload ->> key_name, ''), '[^0-9.\-]', '', 'g'), '')::numeric,
    fallback_value
  );
$$;

create or replace function public.marketos_insert_evidence(
  target_business_id uuid,
  target_record_type public.marketos_record_kind,
  target_record_id uuid,
  target_scan_draft_id uuid,
  evidence_payload jsonb,
  actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_image_path text;
  v_captured_at timestamptz;
begin
  if evidence_payload is null then
    return;
  end if;

  v_image_path := coalesce(nullif(evidence_payload ->> 'imagePath', ''), nullif(evidence_payload ->> 'storagePath', ''));

  if v_image_path is null then
    return;
  end if;

  if nullif(evidence_payload ->> 'capturedAt', '') is not null then
    v_captured_at := (evidence_payload ->> 'capturedAt')::timestamptz;
  end if;

  insert into public.transaction_evidence (
    business_id,
    record_type,
    record_id,
    source,
    image_path,
    file_name,
    mime_type,
    scan_draft_id,
    uploaded_by,
    captured_at
  )
  values (
    target_business_id,
    target_record_type,
    target_record_id,
    coalesce(nullif(evidence_payload ->> 'source', ''), 'upload')::public.marketos_scan_source,
    v_image_path,
    nullif(evidence_payload ->> 'fileName', ''),
    nullif(evidence_payload ->> 'mimeType', ''),
    target_scan_draft_id,
    actor_id,
    coalesce(v_captured_at, now())
  );
end;
$$;

create or replace function public.marketos_void_record(
  target_business_id uuid,
  target_record_type public.marketos_record_kind,
  target_record_id uuid,
  reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_amount numeric := 0;
  v_message text;
  v_item record;
  v_stock_product_id uuid;
  v_stock_quantity numeric;
begin
  if v_actor is null then
    raise exception 'MarketOS void requires an authenticated user.';
  end if;

  if not public.is_marketos_business_member(target_business_id) then
    raise exception 'You do not have access to this MarketOS business.';
  end if;

  if target_record_type = 'sale' then
    update public.sales
    set is_void = true,
        void_reason = coalesce(nullif(reason, ''), 'Voided by owner'),
        voided_at = now(),
        voided_by = v_actor
    where id = target_record_id
      and business_id = target_business_id
      and is_void = false
    returning total into v_amount;

    if not found then
      raise exception 'Sale could not be voided or is already voided.';
    end if;

    for v_item in
      select product_id, quantity
      from public.sale_items
      where sale_id = target_record_id
        and product_id is not null
    loop
      update public.products
      set stock = stock + v_item.quantity
      where id = v_item.product_id
        and business_id = target_business_id;
    end loop;

    v_message := 'Sale voided: ' || coalesce(nullif(reason, ''), 'Voided by owner');
  elsif target_record_type = 'expense' then
    update public.expenses
    set is_void = true,
        void_reason = coalesce(nullif(reason, ''), 'Voided by owner'),
        voided_at = now(),
        voided_by = v_actor
    where id = target_record_id
      and business_id = target_business_id
      and is_void = false
    returning amount into v_amount;

    if not found then
      raise exception 'Expense could not be voided or is already voided.';
    end if;

    v_message := 'Expense voided: ' || coalesce(nullif(reason, ''), 'Voided by owner');
  elsif target_record_type = 'stock' then
    update public.stock_movements
    set is_void = true,
        void_reason = coalesce(nullif(reason, ''), 'Voided by owner'),
        voided_at = now(),
        voided_by = v_actor
    where id = target_record_id
      and business_id = target_business_id
      and is_void = false
    returning product_id, quantity, quantity * unit_cost into v_stock_product_id, v_stock_quantity, v_amount;

    if not found then
      raise exception 'Stock record could not be voided or is already voided.';
    end if;

    if v_stock_product_id is not null then
      update public.products
      set stock = greatest(stock - v_stock_quantity, 0)
      where id = v_stock_product_id
        and business_id = target_business_id;
    end if;

    v_message := 'Stock record voided: ' || coalesce(nullif(reason, ''), 'Voided by owner');
  else
    update public.debts
    set is_void = true,
        void_reason = coalesce(nullif(reason, ''), 'Voided by owner'),
        voided_at = now(),
        voided_by = v_actor
    where id = target_record_id
      and business_id = target_business_id
      and is_void = false
    returning amount into v_amount;

    if not found then
      raise exception 'Debt could not be voided or is already voided.';
    end if;

    v_message := 'Debt voided: ' || coalesce(nullif(reason, ''), 'Voided by owner');
  end if;

  insert into public.activity_log (
    business_id,
    actor_id,
    action,
    record_type,
    record_id,
    message,
    amount,
    record_status
  )
  values (
    target_business_id,
    v_actor,
    'record_voided',
    target_record_type,
    target_record_id,
    v_message,
    v_amount,
    'recorded'
  );

  return jsonb_build_object(
    'recordType', target_record_type,
    'recordId', target_record_id,
    'status', 'voided'
  );
end;
$$;

create or replace function public.marketos_save_reviewed_record(
  target_business_id uuid,
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_kind public.marketos_record_kind := coalesce(nullif(payload ->> 'type', ''), 'sale')::public.marketos_record_kind;
  v_source text := coalesce(nullif(payload ->> 'source', ''), 'manual');
  v_status public.marketos_record_status := case
    when coalesce(nullif(payload #>> '{evidence,imagePath}', ''), nullif(payload #>> '{evidence,storagePath}', '')) is not null then 'evidence_attached'
    else 'recorded'
  end::public.marketos_record_status;
  v_payment_method public.marketos_payment_method := coalesce(nullif(payload ->> 'paymentMethod', ''), 'cash')::public.marketos_payment_method;
  v_customer_name text := coalesce(nullif(payload ->> 'customerName', ''), 'Walk-in customer');
  v_customer_id uuid;
  v_product_name text := coalesce(nullif(payload ->> 'itemName', ''), 'General item');
  v_product_id uuid;
  v_quantity numeric := greatest(public.marketos_payload_number(payload, 'quantity', 1), 0);
  v_unit_price numeric := public.marketos_payload_number(payload, 'unitPrice', 0);
  v_unit_cost numeric := public.marketos_payload_number(payload, 'unitCost', 0);
  v_amount numeric := public.marketos_payload_number(payload, 'amount', 0);
  v_paid_amount numeric;
  v_total numeric;
  v_profit numeric;
  v_balance_owed numeric;
  v_record_id uuid;
  v_debt_id uuid;
  v_scan_draft_id uuid;
  v_corrects_type public.marketos_record_kind;
  v_corrects_id uuid;
  v_existing_product public.products%rowtype;
begin
  if v_actor is null then
    raise exception 'MarketOS save requires an authenticated user.';
  end if;

  if not public.is_marketos_business_member(target_business_id) then
    raise exception 'You do not have access to this MarketOS business.';
  end if;

  if nullif(payload ->> 'scanDraftId', '') is not null then
    v_scan_draft_id := (payload ->> 'scanDraftId')::uuid;
  end if;

  if nullif(payload ->> 'correctsRecordType', '') is not null and nullif(payload ->> 'correctsRecordId', '') is not null then
    v_corrects_type := (payload ->> 'correctsRecordType')::public.marketos_record_kind;
    v_corrects_id := (payload ->> 'correctsRecordId')::uuid;
  end if;

  if nullif(payload ->> 'customerId', '') is not null then
    v_customer_id := (payload ->> 'customerId')::uuid;
  elsif lower(v_customer_name) not in ('walk-in customer', 'customer') then
    select id into v_customer_id
    from public.customers
    where business_id = target_business_id
      and lower(name) = lower(v_customer_name)
    limit 1;

    if v_customer_id is null then
      insert into public.customers (business_id, name)
      values (target_business_id, v_customer_name)
      returning id into v_customer_id;
    end if;
  end if;

  if v_kind in ('sale', 'stock') then
    if nullif(payload ->> 'productId', '') is not null then
      v_product_id := (payload ->> 'productId')::uuid;
    else
      select * into v_existing_product
      from public.products
      where business_id = target_business_id
        and lower(name) = lower(v_product_name)
      limit 1;

      if v_existing_product.id is null then
        insert into public.products (
          business_id,
          name,
          category,
          stock,
          reorder_point,
          unit,
          unit_cost,
          selling_price,
          icon_label
        )
        values (
          target_business_id,
          v_product_name,
          'General',
          0,
          5,
          coalesce(nullif(payload ->> 'stockUnit', ''), 'items'),
          v_unit_cost,
          coalesce(nullif(v_unit_price, 0), v_unit_cost),
          upper(left(v_product_name, 2))
        )
        returning * into v_existing_product;
      end if;

      v_product_id := v_existing_product.id;
    end if;
  end if;

  if v_kind = 'sale' then
    if v_amount <= 0 then
      v_total := v_quantity * v_unit_price;
    else
      v_total := v_amount;
    end if;

    if coalesce(nullif(payload ->> 'paidAmount', ''), '') = '' then
      v_paid_amount := v_total;
    else
      v_paid_amount := least(public.marketos_payload_number(payload, 'paidAmount', 0), v_total);
    end if;

    v_balance_owed := greatest(v_total - v_paid_amount, 0);
    v_profit := greatest((v_unit_price - v_unit_cost) * v_quantity, 0);

    insert into public.sales (
      business_id,
      customer_id,
      customer_name,
      total,
      profit,
      paid_amount,
      balance_owed,
      payment_method,
      payment_status,
      record_status,
      source,
      created_by
    )
    values (
      target_business_id,
      v_customer_id,
      v_customer_name,
      v_total,
      v_profit,
      v_paid_amount,
      v_balance_owed,
      case when v_balance_owed > 0 then 'credit'::public.marketos_payment_method else v_payment_method end,
      case when v_balance_owed <= 0 then 'paid' when v_paid_amount > 0 then 'partial' else 'owed' end,
      v_status,
      v_source,
      v_actor
    )
    returning id into v_record_id;

    insert into public.sale_items (sale_id, product_id, name, quantity, unit_price, unit_cost)
    values (
      v_record_id,
      v_product_id,
      concat(v_quantity::text, ' ', v_product_name),
      v_quantity,
      v_unit_price,
      v_unit_cost
    );

    if v_product_id is not null then
      update public.products
      set stock = greatest(stock - v_quantity, 0),
          unit_cost = case when v_unit_cost > 0 then v_unit_cost else unit_cost end,
          selling_price = case when v_unit_price > 0 then v_unit_price else selling_price end
      where id = v_product_id
        and business_id = target_business_id;
    end if;

    if v_balance_owed > 0 then
      insert into public.debts (
        business_id,
        customer_id,
        customer_name,
        amount,
        paid_amount,
        last_activity,
        record_status,
        source_record_id,
        created_by
      )
      values (
        target_business_id,
        v_customer_id,
        v_customer_name,
        v_balance_owed,
        0,
        coalesce(nullif(payload ->> 'itemName', ''), nullif(payload ->> 'summary', ''), 'Sale balance'),
        v_status,
        v_record_id,
        v_actor
      )
      returning id into v_debt_id;
    end if;

    perform public.marketos_insert_evidence(target_business_id, 'sale', v_record_id, v_scan_draft_id, payload -> 'evidence', v_actor);

    insert into public.activity_log (business_id, actor_id, action, record_type, record_id, message, amount, record_status)
    values (target_business_id, v_actor, 'record_saved', 'sale', v_record_id, 'Sale recorded for ' || v_customer_name, v_total, v_status);
  elsif v_kind = 'expense' then
    insert into public.expenses (
      business_id,
      label,
      amount,
      category,
      payment_method,
      record_status,
      source,
      created_by
    )
    values (
      target_business_id,
      coalesce(nullif(payload ->> 'itemName', ''), nullif(payload ->> 'summary', ''), 'Business expense'),
      v_amount,
      coalesce(nullif(payload ->> 'expenseCategory', ''), 'Operations'),
      v_payment_method,
      v_status,
      v_source,
      v_actor
    )
    returning id into v_record_id;

    perform public.marketos_insert_evidence(target_business_id, 'expense', v_record_id, v_scan_draft_id, payload -> 'evidence', v_actor);

    insert into public.activity_log (business_id, actor_id, action, record_type, record_id, message, amount, record_status)
    values (target_business_id, v_actor, 'record_saved', 'expense', v_record_id, 'Expense recorded', v_amount, v_status);
  elsif v_kind = 'stock' then
    update public.products
    set stock = stock + v_quantity,
        unit_cost = case when v_unit_cost > 0 then v_unit_cost else unit_cost end
    where id = v_product_id
      and business_id = target_business_id;

    insert into public.stock_movements (
      business_id,
      product_id,
      product_name,
      movement_type,
      quantity,
      unit,
      unit_cost,
      note,
      record_status,
      created_by
    )
    select
      target_business_id,
      products.id,
      products.name,
      'in',
      v_quantity,
      products.unit,
      v_unit_cost,
      coalesce(nullif(payload ->> 'note', ''), nullif(payload ->> 'summary', ''), 'Stock added'),
      v_status,
      v_actor
    from public.products products
    where products.id = v_product_id
      and products.business_id = target_business_id
    returning id into v_record_id;

    perform public.marketos_insert_evidence(target_business_id, 'stock', v_record_id, v_scan_draft_id, payload -> 'evidence', v_actor);

    insert into public.activity_log (business_id, actor_id, action, record_type, record_id, message, amount, record_status)
    values (target_business_id, v_actor, 'record_saved', 'stock', v_record_id, 'Stock added: ' || v_product_name, v_quantity * v_unit_cost, v_status);
  else
    insert into public.debts (
      business_id,
      customer_id,
      customer_name,
      amount,
      paid_amount,
      last_activity,
      record_status,
      created_by
    )
    values (
      target_business_id,
      v_customer_id,
      v_customer_name,
      v_amount,
      public.marketos_payload_number(payload, 'paidAmount', 0),
      coalesce(nullif(payload ->> 'itemName', ''), nullif(payload ->> 'summary', ''), 'Manual debt record'),
      v_status,
      v_actor
    )
    returning id into v_record_id;

    perform public.marketos_insert_evidence(target_business_id, 'debt', v_record_id, v_scan_draft_id, payload -> 'evidence', v_actor);

    insert into public.activity_log (business_id, actor_id, action, record_type, record_id, message, amount, record_status)
    values (target_business_id, v_actor, 'record_saved', 'debt', v_record_id, 'Debt recorded for ' || v_customer_name, v_amount, v_status);
  end if;

  if v_scan_draft_id is not null then
    update public.scan_drafts
    set status = 'recorded',
        reviewed_record_type = v_kind,
        reviewed_record_id = v_record_id,
        reviewed_at = now(),
        review_note = coalesce(nullif(payload ->> 'note', ''), 'Reviewed and saved')
    where id = v_scan_draft_id
      and business_id = target_business_id;
  end if;

  if v_corrects_type is not null and v_corrects_id is not null then
    perform public.marketos_void_record(target_business_id, v_corrects_type, v_corrects_id, 'Corrected by replacement record');

    if v_corrects_type = 'sale' then
      update public.sales set corrected_by_record_type = v_kind, corrected_by_record_id = v_record_id where id = v_corrects_id and business_id = target_business_id;
    elsif v_corrects_type = 'expense' then
      update public.expenses set corrected_by_record_type = v_kind, corrected_by_record_id = v_record_id where id = v_corrects_id and business_id = target_business_id;
    elsif v_corrects_type = 'stock' then
      update public.stock_movements set corrected_by_record_type = v_kind, corrected_by_record_id = v_record_id where id = v_corrects_id and business_id = target_business_id;
    else
      update public.debts set corrected_by_record_type = v_kind, corrected_by_record_id = v_record_id where id = v_corrects_id and business_id = target_business_id;
    end if;
  end if;

  return jsonb_build_object(
    'recordType', v_kind,
    'recordId', v_record_id,
    'status', v_status
  );
end;
$$;

create or replace function public.marketos_create_scan_draft(
  target_business_id uuid,
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_draft_id uuid;
  v_captured_at timestamptz;
begin
  if v_actor is null then
    raise exception 'MarketOS scan drafts require an authenticated user.';
  end if;

  if not public.is_marketos_business_member(target_business_id) then
    raise exception 'You do not have access to this MarketOS business.';
  end if;

  if nullif(payload ->> 'capturedAt', '') is not null then
    v_captured_at := (payload ->> 'capturedAt')::timestamptz;
  end if;

  insert into public.scan_drafts (
    business_id,
    image_path,
    file_name,
    mime_type,
    source,
    extracted_summary,
    entry_type,
    status,
    created_by,
    captured_at
  )
  values (
    target_business_id,
    nullif(payload ->> 'imagePath', ''),
    nullif(payload ->> 'fileName', ''),
    nullif(payload ->> 'mimeType', ''),
    coalesce(nullif(payload ->> 'source', ''), 'upload')::public.marketos_scan_source,
    coalesce(nullif(payload ->> 'summary', ''), 'Manual review required before saving.'),
    coalesce(nullif(payload ->> 'entryType', ''), 'sale')::public.marketos_record_kind,
    'draft',
    v_actor,
    coalesce(v_captured_at, now())
  )
  returning id into v_draft_id;

  insert into public.activity_log (
    business_id,
    actor_id,
    action,
    record_type,
    record_id,
    message,
    record_status
  )
  values (
    target_business_id,
    v_actor,
    'scan_draft_created',
    coalesce(nullif(payload ->> 'entryType', ''), 'sale')::public.marketos_record_kind,
    v_draft_id,
    'Scan draft waiting for review',
    'draft'
  );

  return jsonb_build_object('draftId', v_draft_id, 'status', 'draft');
end;
$$;

drop policy if exists "business owner can manage businesses" on public.businesses;
drop policy if exists "members can read their business" on public.businesses;
drop policy if exists "owners and members can manage membership" on public.business_members;
drop policy if exists "members can manage customers" on public.customers;
drop policy if exists "members can manage products" on public.products;
drop policy if exists "members can manage sales" on public.sales;
drop policy if exists "members can manage sale items" on public.sale_items;
drop policy if exists "members can manage expenses" on public.expenses;
drop policy if exists "members can manage debts" on public.debts;
drop policy if exists "members can manage stock movements" on public.stock_movements;
drop policy if exists "members can manage evidence" on public.transaction_evidence;
drop policy if exists "members can manage scan drafts" on public.scan_drafts;
drop policy if exists "members can read activity" on public.activity_log;
drop policy if exists "members can create activity" on public.activity_log;
drop policy if exists "members can upload evidence files" on storage.objects;
drop policy if exists "members can read evidence files" on storage.objects;
drop policy if exists "members can update evidence files" on storage.objects;

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

grant execute on function public.marketos_save_reviewed_record(uuid, jsonb) to authenticated;
grant execute on function public.marketos_void_record(uuid, public.marketos_record_kind, uuid, text) to authenticated;
grant execute on function public.marketos_create_scan_draft(uuid, jsonb) to authenticated;
