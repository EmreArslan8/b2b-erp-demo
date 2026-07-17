import { cache } from "react";
import { createClient, isSupabaseConfigured } from "./server";

export const DEFAULT_BRAND_NAME = "TedarikPro";

type CategoryRow = { id: string; name: string; parent_id: string | null; active?: boolean; sort_order?: number };

function categoryLabels(categoryId: string | null, categoryMap: Map<string, CategoryRow>) {
  const selected = categoryId ? categoryMap.get(categoryId) : undefined;
  if (!selected) return { category: "", subcategory: "" };
  const parent = selected.parent_id ? categoryMap.get(selected.parent_id) : undefined;
  return parent ? { category: parent.name, subcategory: selected.name } : { category: selected.name, subcategory: "" };
}

export const getBrandName = cache(async (): Promise<string> => {
  if (!isSupabaseConfigured()) return DEFAULT_BRAND_NAME;
  try {
    const supabase = await createClient();
    const result = await supabase.from("app_settings").select("value").eq("key", "brand_name").maybeSingle();
    const value = result.data?.value?.trim();
    return value || DEFAULT_BRAND_NAME;
  } catch {
    return DEFAULT_BRAND_NAME;
  }
});

export async function getDashboardData() {
  if (!isSupabaseConfigured()) return { connected: false, error: "Veri bağlantısı kurulamadı. Lütfen sistem yöneticinizle iletişime geçin.", todayOrders: 0, openOrders: 0, customerCount: 0, critical: 0, paymentTotal: 0 };
  const supabase = await createClient();
  const [orders, customers, products, stock, payments] = await Promise.all([
    supabase.from("orders").select("id,status,created_at").order("created_at", { ascending: false }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id,critical_level", { count: "exact" }).eq("active", true),
    supabase.from("product_stock").select("product_id,quantity"),
    supabase.from("payments").select("amount"),
  ]);
  const error = [orders, customers, products, stock, payments].find((result) => result.error)?.error;
  const rows = orders.data ?? [];
  const today = new Date().toDateString();
  const todayOrders = rows.filter((row) => new Date(row.created_at).toDateString() === today);
  const openOrders = rows.filter((row) => !["Tamamlandı", "Teslim Edildi", "İptal Edildi"].includes(row.status));
  const stockByProduct = new Map<string, number>();
  (stock.data ?? []).forEach((row) => stockByProduct.set(row.product_id, (stockByProduct.get(row.product_id) ?? 0) + Number(row.quantity)));
  const critical = (products.data ?? []).filter((product) => (stockByProduct.get(product.id) ?? 0) <= Number(product.critical_level)).length;
  return { connected: !error, error: error?.message ?? null, todayOrders: todayOrders.length, openOrders: openOrders.length, customerCount: customers.count ?? 0, critical, paymentTotal: (payments.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0) };
}

export async function getCustomerLinks() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const result = await (await createClient()).from("customers").select("id,name,link_slug").eq("active", true).order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getCustomerProducts(slug: string) {
  if (!isSupabaseConfigured()) return { customer: null, products: [], error: "Veri bağlantısı kurulamadı. Lütfen sistem yöneticinizle iletişime geçin." };
  const supabase = await createClient();
  const customer = await supabase.from("customers").select("id,name,link_slug").eq("link_slug", slug).eq("active", true).maybeSingle();
  if (customer.error || !customer.data) return { customer: null, products: [], error: customer.error?.message ?? "Müşteri bulunamadı" };
  const [products, prices, categories] = await Promise.all([
    supabase.from("products").select("id,name,sku,category_id,brand,unit,price,image_url,sort_order").eq("active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("product_prices").select("product_id,price").eq("customer_id", customer.data.id),
    supabase.from("categories").select("id,name,parent_id").eq("active", true),
  ]);
  const priceMap = new Map((prices.data ?? []).map((row) => [row.product_id, Number(row.price)]));
  const categoryMap = new Map((categories.data ?? []).map((row) => [row.id, row as CategoryRow]));
  return { customer: customer.data, products: (products.data ?? []).map((product) => ({ ...product, ...categoryLabels(product.category_id, categoryMap), price: priceMap.get(product.id) ?? Number(product.price) })), error: products.error?.message ?? prices.error?.message ?? categories.error?.message ?? null };
}

export async function getProducts() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const [result, categories] = await Promise.all([
    supabase.from("products").select("id,name,barcode,sku,category_id,brand,supplier_id,unit,price,cost,critical_level,active,image_url,sort_order,product_prices(customer_id,price),cost_history(id,cost,changed_at)").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("categories").select("id,name,parent_id,active,sort_order").order("sort_order").order("name"),
  ]);
  const categoryMap = new Map((categories.data ?? []).map((row) => [row.id, row as CategoryRow]));
  return { data: (result.data ?? []).map((product) => ({ ...product, ...categoryLabels(product.category_id, categoryMap) })), error: result.error?.message ?? categories.error?.message ?? null };
}

export async function getCategoryOptions() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const result = await (await createClient()).from("categories").select("id,name,parent_id,active,sort_order").eq("active", true).order("sort_order").order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getCategories() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const [categories, products] = await Promise.all([
    supabase.from("categories").select("id,name,parent_id,active,sort_order").order("sort_order").order("name"),
    supabase.from("products").select("category_id,active"),
  ]);
  if (categories.error || products.error) return { data: [], error: categories.error?.message ?? products.error?.message ?? "Kategoriler alınamadı." };
  const rows = (categories.data ?? []) as CategoryRow[];
  const children = new Map<string, CategoryRow[]>();
  rows.filter((row) => row.parent_id).forEach((row) => children.set(row.parent_id!, [...(children.get(row.parent_id!) ?? []), row]));
  const productRows = products.data ?? [];
  const data = rows.filter((row) => !row.parent_id).map((category) => {
    const childRows = children.get(category.id) ?? [];
    const ids = new Set([category.id, ...childRows.map((child) => child.id)]);
    const related = productRows.filter((product) => product.category_id && ids.has(product.category_id));
    return { id: category.id, name: category.name, total: related.length, active: related.filter((product) => product.active !== false).length, subcategories: childRows.map((child) => child.name).sort((a, b) => a.localeCompare(b, "tr-TR")) };
  });
  return { data, error: null };
}

export async function getSuppliers() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("suppliers").select("id,name,contact,phone,email,products(id,name,sku,cost,price,active)").order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getSupplierOptions() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const result = await (await createClient()).from("suppliers").select("id,name").order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getOrders() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("orders").select("id,order_no,status,note,discount,manual_total,customer_id,created_at,customers(name),order_items(id,qty,price,products(name,sku,cost,supplier_id,sort_order,suppliers(name)))").order("created_at", { ascending: false });
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getOrder(id: string) {
  if (!isSupabaseConfigured()) return { data: null, error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("orders").select("id,order_no,status,note,discount,manual_total,customer_id,created_at,customers(name),order_items(id,qty,price,products(name,sku,cost,supplier_id,sort_order,suppliers(name)))").eq("id", id).maybeSingle();
  return { data: result.data, error: result.error?.message ?? null };
}

export async function getCustomers() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("customers").select("id,code,name,contact,phone,link_slug,active,orders(id,order_no,manual_total,discount,order_items(qty,price)),payments(id,order_id,amount,method,note,created_at)").order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getCustomerOptions() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const result = await (await createClient()).from("customers").select("id,name").eq("active", true).order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getStock() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("product_stock").select("product_id,warehouse_id,quantity,products(name,sku,critical_level),warehouses(name)").order("quantity");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getStockTotals() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const result = await (await createClient()).from("product_stock").select("product_id,quantity");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getStockOptions() {
  if (!isSupabaseConfigured()) return { products: [], warehouses: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const [products, warehouses] = await Promise.all([
    supabase.from("products").select("id,name,sku,unit").eq("active", true).order("name"),
    supabase.from("warehouses").select("id,name").eq("active", true).order("name"),
  ]);
  return { products: products.data ?? [], warehouses: warehouses.data ?? [], error: products.error?.message ?? warehouses.error?.message ?? null };
}

export async function getStockMovements() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const result = await (await createClient()).from("stock_movements").select("id,type,qty,ref,created_at,products(name,sku),from_warehouse,to_warehouse").order("created_at", { ascending: false }).limit(100);
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getActivityLogs() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const [orders, stock, payments] = await Promise.all([
    supabase.from("order_logs").select("id,text,created_at,orders(order_no),profiles(full_name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("stock_movements").select("id,type,qty,ref,created_at,products(name),profiles(full_name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("payments").select("id,amount,method,note,created_at,customers(name),profiles(full_name)").order("created_at", { ascending: false }).limit(100),
  ]);
  const one = (value: unknown) => (Array.isArray(value) ? value[0] : value) as { full_name?: string; order_no?: string; name?: string } | null;
  const data = [
    ...(orders.data ?? []).map((row) => ({ id: `order-${row.id}`, type: "Sipariş", text: row.text, created_at: row.created_at, actor: one(row.profiles)?.full_name, ref: one(row.orders)?.order_no })),
    ...(stock.data ?? []).map((row) => ({ id: `stock-${row.id}`, type: `Stok ${row.type}`, text: `${row.qty} adet · ${row.ref || ""}`, created_at: row.created_at, actor: one(row.profiles)?.full_name, ref: one(row.products)?.name })),
    ...(payments.data ?? []).map((row) => ({ id: `payment-${row.id}`, type: "Tahsilat", text: `₺${Number(row.amount).toFixed(2)} · ${row.method}${row.note ? ` · ${row.note}` : ""}`, created_at: row.created_at, actor: one(row.profiles)?.full_name, ref: one(row.customers)?.name })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 200);
  return { data, error: orders.error?.message ?? stock.error?.message ?? payments.error?.message ?? null };
}

export async function getReportsData() {
  if (!isSupabaseConfigured()) return { error: "Veri bağlantısı ayarları eksik.", sales: { daily: 0, monthly: 0 }, payments: 0, profit: 0, products: [], customers: [], suppliers: [], critical: [] };
  const supabase = await createClient();
  const [orders, payments, stock] = await Promise.all([
    supabase.from("orders").select("status,customer_id,created_at,manual_total,discount,customers(name),order_items(qty,price,products(name,cost,suppliers(name)))"),
    supabase.from("payments").select("amount"),
    supabase.from("product_stock").select("quantity,products(name,sku,critical_level),warehouses(name)"),
  ]);
  const error = orders.error?.message ?? payments.error?.message ?? stock.error?.message ?? null;
  const now = new Date(); const today = now.toDateString(); const month = `${now.getFullYear()}-${now.getMonth()}`;
  const products = new Map<string, { name: string; qty: number; sales: number; cost: number }>(); const customers = new Map<string, { name: string; sales: number }>(); const suppliers = new Map<string, { name: string; qty: number; cost: number }>(); let daily = 0; let monthly = 0; let profit = 0;
  for (const order of orders.data ?? []) { if (order.status === "İptal Edildi") continue; const date = new Date(order.created_at); const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers; let orderTotal = 0; for (const item of order.order_items ?? []) { const product = Array.isArray(item.products) ? item.products[0] : item.products; const qty = Number(item.qty); const sales = qty * Number(item.price); const cost = qty * Number(product?.cost ?? 0); orderTotal += sales; profit += sales - cost; const productRow = products.get(product?.name ?? "Ürün") ?? { name: product?.name ?? "Ürün", qty: 0, sales: 0, cost: 0 }; productRow.qty += qty; productRow.sales += sales; productRow.cost += cost; products.set(productRow.name, productRow); const supplier = Array.isArray(product?.suppliers) ? product?.suppliers[0] : product?.suppliers; const supplierRow = suppliers.get(supplier?.name ?? "Belirtilmemiş") ?? { name: supplier?.name ?? "Belirtilmemiş", qty: 0, cost: 0 }; supplierRow.qty += qty; supplierRow.cost += cost; suppliers.set(supplierRow.name, supplierRow); } const finalTotal = Number(order.manual_total ?? orderTotal - Number(order.discount ?? 0)); if (date.toDateString() === today) daily += finalTotal; if (`${date.getFullYear()}-${date.getMonth()}` === month) monthly += finalTotal; const customerRow = customers.get(order.customer_id) ?? { name: customer?.name ?? "Müşteri", sales: 0 }; customerRow.sales += finalTotal; customers.set(order.customer_id, customerRow); }
  const critical = (stock.data ?? []).map((row) => { const product = Array.isArray(row.products) ? row.products[0] : row.products; const warehouse = Array.isArray(row.warehouses) ? row.warehouses[0] : row.warehouses; return { product: product?.name ?? "Ürün", warehouse: warehouse?.name ?? "Depo", quantity: Number(row.quantity), critical: Number(product?.critical_level ?? 0) }; }).filter((row) => row.quantity <= row.critical);
  return { error, sales: { daily, monthly }, payments: (payments.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0), profit, products: [...products.values()].sort((a, b) => b.sales - a.sales), customers: [...customers.values()].sort((a, b) => b.sales - a.sales), suppliers: [...suppliers.values()].sort((a, b) => b.cost - a.cost), critical };
}

export async function getCurrentProfile() {
  if (!isSupabaseConfigured()) return { data: null, error: null };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: null };
  const result = await supabase.from("profiles").select("id,full_name,role,active").eq("id", user.id).maybeSingle();
  return { data: result.data, error: result.error?.message ?? null };
}

export async function getProfiles() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("profiles").select("id,full_name,role,active,created_at").order("created_at");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getTasks() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Oturum bulunamadı." };
  const { data: profile } = await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
  let query = supabase.from("tasks").select("id,title,description,status,due_date,assigned_to,created_at,assignee:profiles!tasks_assigned_to_fkey(full_name)").order("created_at", { ascending: false });
  if (profile?.active && profile.role === "sales") query = query.eq("assigned_to", user.id);
  const result = await query;
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getNotifications() {
  if (!isSupabaseConfigured()) return { data: [], error: "Veri bağlantısı ayarları eksik." };
  const result = await (await createClient()).from("notifications").select("id,read,created_at,orders(order_no,customers(name),manual_total,order_items(qty,price))").eq("read", false).order("created_at", { ascending: false }).limit(20);
  return { data: result.data ?? [], error: result.error?.message ?? null };
}
