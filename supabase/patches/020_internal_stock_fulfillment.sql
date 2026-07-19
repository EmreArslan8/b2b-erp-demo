-- Internal warehouse fulfillment, reservations, supplier demand and true-cost reporting.
-- Run after the base schema and previous patches.

create table if not exists public.supplier_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  supplier_id uuid references public.suppliers(id),
  product_id uuid not null references public.products(id),
  qty numeric not null check (qty > 0),
  unit_cost numeric not null default 0,
  status text not null default 'Bekliyor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_debts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id),
  product_id uuid references public.products(id),
  order_id uuid references public.orders(id),
  stock_movement_id uuid references public.stock_movements(id),
  amount numeric not null check (amount >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.product_stock add column if not exists reserved_quantity numeric not null default 0;
alter table public.product_stock add column if not exists incoming_quantity numeric not null default 0;

alter table public.products add column if not exists min_stock_level numeric;
alter table public.products add column if not exists last_purchase_price numeric;
alter table public.products add column if not exists average_cost numeric;
alter table public.suppliers add column if not exists active boolean not null default true;

update public.products
set
  min_stock_level = coalesce(min_stock_level, critical_level, 0),
  last_purchase_price = coalesce(last_purchase_price, cost, 0),
  average_cost = coalesce(average_cost, cost, 0);

alter table public.order_items add column if not exists available_at_order numeric not null default 0;
alter table public.order_items add column if not exists fulfillment_source text not null default 'Tedarikçi';
alter table public.order_items add column if not exists warehouse_qty numeric not null default 0;
alter table public.order_items add column if not exists supplier_qty numeric not null default 0;
alter table public.order_items add column if not exists reserved_qty numeric not null default 0;
alter table public.order_items add column if not exists source_warehouse_id uuid references public.warehouses(id);
alter table public.order_items add column if not exists unit_cost numeric;
alter table public.order_items add column if not exists net_profit numeric;
alter table public.order_items add column if not exists fulfillment_locked boolean not null default false;

alter table public.orders add column if not exists shipping_cost numeric not null default 0;
alter table public.orders add column if not exists other_costs numeric not null default 0;
alter table public.payments add column if not exists status text not null default 'Aktif';
alter table public.payments add column if not exists cancelled_at timestamptz;
alter table public.supplier_payments add column if not exists status text not null default 'Aktif';
alter table public.supplier_payments add column if not exists cancelled_at timestamptz;

alter table public.stock_movements drop constraint if exists stock_movements_type_check;
alter table public.stock_movements add constraint stock_movements_type_check check (type in ('Giriş','Çıkış','Transfer','Satın alma girişi','Satış çıkışı','Rezervasyon','Rezervasyon iptali','Müşteri iadesi','Tedarikçiye iade','Fire/hasarlı ürün','Sayım düzeltmesi','Depolar arası transfer'));

create index if not exists idx_supplier_order_items_supplier on public.supplier_order_items(supplier_id, status);
create index if not exists idx_supplier_order_items_order on public.supplier_order_items(order_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id, created_at desc);

alter table public.supplier_order_items enable row level security;
alter table public.supplier_debts enable row level security;
alter table public.audit_logs enable row level security;

do $$ declare t text; begin
  foreach t in array array['supplier_order_items','supplier_debts','audit_logs'] loop
    execute format('drop policy if exists staff_select on public.%I', t);
    execute format('create policy staff_select on public.%I for select to authenticated using (public.is_staff())', t);
    execute format('drop policy if exists staff_insert on public.%I', t);
    execute format('create policy staff_insert on public.%I for insert to authenticated with check (public.is_staff())', t);
    execute format('drop policy if exists staff_update on public.%I', t);
    execute format('create policy staff_update on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

create or replace function public.stock_available(p_product_id uuid, p_warehouse_id uuid default null)
returns numeric
language sql
stable
as $$
  select coalesce(sum(quantity - reserved_quantity), 0)
  from public.product_stock
  where product_id = p_product_id
    and (p_warehouse_id is null or warehouse_id = p_warehouse_id)
$$;

create or replace function public.plan_order_fulfillment(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  stock_row record;
  remaining numeric;
  own_qty numeric;
  source_label text;
begin
  delete from public.supplier_order_items where order_id = p_order_id and status = 'Bekliyor';

  for item in
    select oi.id, oi.product_id, oi.qty, oi.supplier_qty, oi.reserved_qty, oi.fulfillment_locked, p.supplier_id, coalesce(p.average_cost, p.cost, 0) as cost
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
    order by oi.id
  loop
    if item.reserved_qty > 0 then
      if item.supplier_qty > 0 then
        insert into public.supplier_order_items (order_id, order_item_id, supplier_id, product_id, qty, unit_cost)
        select p_order_id, item.id, item.supplier_id, item.product_id, item.supplier_qty, item.cost
        where item.supplier_id is not null;
      end if;
      continue;
    end if;

    if item.fulfillment_locked then
      if item.supplier_qty > 0 then
        insert into public.supplier_order_items (order_id, order_item_id, supplier_id, product_id, qty, unit_cost)
        select p_order_id, item.id, item.supplier_id, item.product_id, item.supplier_qty, item.cost
        where item.supplier_id is not null;
      end if;
      continue;
    end if;

    remaining := item.qty;
    own_qty := 0;
    select ps.warehouse_id, greatest(ps.quantity - ps.reserved_quantity, 0) as available
    into stock_row
    from public.product_stock ps
    where ps.product_id = item.product_id and ps.quantity - ps.reserved_quantity > 0
    order by ps.quantity - ps.reserved_quantity desc, ps.warehouse_id
    limit 1;

    if stock_row.warehouse_id is not null then
      own_qty := least(remaining, stock_row.available);
      remaining := remaining - own_qty;
    end if;

    source_label := case
      when own_qty >= item.qty then 'Kendi depo'
      when own_qty > 0 and remaining > 0 then 'Depo + tedarikçi'
      else 'Tedarikçi'
    end;

    update public.order_items
    set
      available_at_order = coalesce(stock_row.available, 0),
      fulfillment_source = source_label,
      warehouse_qty = own_qty,
      supplier_qty = greatest(remaining, 0),
      source_warehouse_id = stock_row.warehouse_id,
      unit_cost = item.cost,
      net_profit = (qty * price) - (item.qty * item.cost)
    where id = item.id;

    if remaining > 0 and item.supplier_id is not null then
      insert into public.supplier_order_items (order_id, order_item_id, supplier_id, product_id, qty, unit_cost)
      values (p_order_id, item.id, item.supplier_id, item.product_id, remaining, item.cost);
    end if;
  end loop;
end;
$$;

create or replace function public.reserve_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  perform public.plan_order_fulfillment(p_order_id);

  for item in
    select id, product_id, source_warehouse_id, warehouse_qty, reserved_qty
    from public.order_items
    where order_id = p_order_id and warehouse_qty > reserved_qty
  loop
    if item.source_warehouse_id is null then
      raise exception 'Depodan karşılanacak kalem için depo seçilmemiş.';
    end if;

    update public.product_stock
    set reserved_quantity = reserved_quantity + (item.warehouse_qty - item.reserved_qty)
    where product_id = item.product_id
      and warehouse_id = item.source_warehouse_id
      and quantity - reserved_quantity >= (item.warehouse_qty - item.reserved_qty);

    if not found then
      raise exception 'Satılabilir stok rezervasyon için yetersiz.';
    end if;

    update public.order_items set reserved_qty = warehouse_qty where id = item.id;
    insert into public.stock_movements (type, product_id, qty, from_warehouse, to_warehouse, ref)
    values ('Rezervasyon', item.product_id, item.warehouse_qty - item.reserved_qty, item.source_warehouse_id, null, 'Sipariş rezervasyonu');
  end loop;
end;
$$;

create or replace function public.release_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  for item in
    select id, product_id, source_warehouse_id, reserved_qty
    from public.order_items
    where order_id = p_order_id and reserved_qty > 0
  loop
    update public.product_stock
    set reserved_quantity = greatest(reserved_quantity - item.reserved_qty, 0)
    where product_id = item.product_id and warehouse_id = item.source_warehouse_id;

    insert into public.stock_movements (type, product_id, qty, from_warehouse, to_warehouse, ref)
    values ('Rezervasyon iptali', item.product_id, item.reserved_qty, item.source_warehouse_id, null, 'Sipariş iptali');

    update public.order_items set reserved_qty = 0 where id = item.id;
  end loop;
end;
$$;

create or replace function public.ship_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  for item in
    select id, product_id, source_warehouse_id, reserved_qty
    from public.order_items
    where order_id = p_order_id and reserved_qty > 0
  loop
    update public.product_stock
    set quantity = quantity - item.reserved_qty,
        reserved_quantity = greatest(reserved_quantity - item.reserved_qty, 0)
    where product_id = item.product_id
      and warehouse_id = item.source_warehouse_id
      and quantity >= item.reserved_qty;

    if not found then
      raise exception 'Fiziksel stok satış çıkışı için yetersiz.';
    end if;

    insert into public.stock_movements (type, product_id, qty, from_warehouse, to_warehouse, ref)
    values ('Satış çıkışı', item.product_id, item.reserved_qty, item.source_warehouse_id, null, 'Sipariş sevk/teslim');

    update public.order_items set reserved_qty = 0 where id = item.id;
  end loop;
end;
$$;

create or replace function public.create_public_order(p_link_slug text, p_items jsonb, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_row record;
  item jsonb;
  product_row record;
  created_order_id uuid;
  order_no text;
  qty numeric;
  unit_price numeric;
begin
  select id into customer_row
  from public.customers
  where link_slug = p_link_slug and active = true
  limit 1;

  if customer_row.id is null then
    raise exception 'Müşteri bulunamadı.';
  end if;

  order_no := 'SIP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 9));

  insert into public.orders (order_no, customer_id, status, note)
  values (order_no, customer_row.id, 'Yeni Sipariş', coalesce(p_note, ''))
  returning id into created_order_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := nullif(item->>'qty', '')::numeric;
    if qty is null or qty <= 0 then
      raise exception 'Geçersiz ürün adedi.';
    end if;

    select p.id, p.price, pp.price as customer_price
    into product_row
    from public.products p
    left join public.product_prices pp on pp.product_id = p.id and pp.customer_id = customer_row.id
    where p.id = nullif(item->>'productId', '')::uuid and p.active = true
    limit 1;

    if product_row.id is null then
      raise exception 'Ürün bulunamadı.';
    end if;

    unit_price := coalesce(product_row.customer_price, product_row.price, 0);

    insert into public.order_items (order_id, product_id, qty, price)
    values (created_order_id, product_row.id, qty, unit_price);
  end loop;

  perform public.plan_order_fulfillment(created_order_id);
  insert into public.notifications (order_id) values (created_order_id);
  insert into public.order_logs (order_id, text) values (created_order_id, 'Müşteri bağlantısından sipariş oluşturuldu.');

  return jsonb_build_object('ok', true, 'orderId', created_order_id, 'orderNo', order_no);
end;
$$;
