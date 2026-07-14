import { createClient, isSupabaseConfigured } from "./server";

export async function getDashboardData() {
  if (!isSupabaseConfigured()) return { connected: false, error: "Supabase ayarları eksik. .env.example dosyasını .env.local olarak kopyalayın.", todayOrders: 0, openOrders: 0, customerCount: 0, critical: 0, paymentTotal: 0 };
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

export async function getCustomerProducts(slug: string) {
  if (!isSupabaseConfigured()) return { customer: null, products: [], error: "Supabase ayarları eksik. .env.example dosyasını .env.local olarak kopyalayın." };
  const supabase = await createClient();
  const customer = await supabase.from("customers").select("id,name,link_slug").eq("link_slug", slug).eq("active", true).maybeSingle();
  if (customer.error || !customer.data) return { customer: null, products: [], error: customer.error?.message ?? "Müşteri bulunamadı" };
  const [products, prices] = await Promise.all([
    supabase.from("products").select("id,name,sku,category,brand,unit,price,image_url").eq("active", true).order("name"),
    supabase.from("product_prices").select("product_id,price").eq("customer_id", customer.data.id),
  ]);
  const priceMap = new Map((prices.data ?? []).map((row) => [row.product_id, Number(row.price)]));
  return { customer: customer.data, products: (products.data ?? []).map((product) => ({ ...product, price: priceMap.get(product.id) ?? Number(product.price) })), error: products.error?.message ?? prices.error?.message ?? null };
}

export async function getProducts() {
  if (!isSupabaseConfigured()) return { data: [], error: "Supabase ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("products").select("id,name,barcode,sku,category,brand,supplier_id,unit,price,cost,critical_level,active,image_url,product_prices(customer_id,price)").order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getSuppliers() {
  if (!isSupabaseConfigured()) return { data: [], error: "Supabase ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("suppliers").select("id,name").order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getOrders() {
  if (!isSupabaseConfigured()) return { data: [], error: "Supabase ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("orders").select("id,order_no,status,note,discount,created_at,customers(name),order_items(qty,price,products(name))").order("created_at", { ascending: false });
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getCustomers() {
  if (!isSupabaseConfigured()) return { data: [], error: "Supabase ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("customers").select("id,code,name,contact,phone,link_slug,active").order("name");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}

export async function getStock() {
  if (!isSupabaseConfigured()) return { data: [], error: "Supabase ayarları eksik." };
  const supabase = await createClient();
  const result = await supabase.from("product_stock").select("product_id,warehouse_id,quantity,products(name,sku,critical_level),warehouses(name)").order("quantity");
  return { data: result.data ?? [], error: result.error?.message ?? null };
}
