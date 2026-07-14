import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const source = fs.readFileSync(new URL("../js/data.js", import.meta.url), "utf8") + "\n;globalThis.__seed = SEED; globalThis.__seedDynamic = seedDynamic;";
const context = {};
vm.createContext(context);
new vm.Script(source).runInContext(context);
const seed = context.__seed;
const products = seed.products.filter((product) => product.sku.startsWith("MED-"));
const suppliers = seed.suppliers.filter((supplier) => supplier.id === "sup4");
const dynamic = { orders: [], payments: [], movements: [], notifications: [] };
const uuid = new Map();
const id = (value) => { if (!value) return null; if (!uuid.has(value)) uuid.set(value, crypto.randomUUID()); return uuid.get(value); };
const sql = (value) => value === null || value === undefined ? "null" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const values = (rows, fields) => rows.map((row) => `(${fields.map((field) => sql(row[field])).join(", ")})`).join(",\n");
const optional = (rows, statement) => rows.length ? statement : "-- no rows for this section";
const costRows = Object.entries(seed.costHistory ?? {}).filter(([productId]) => products.some((product) => product.id === productId)).flatMap(([productId, history]) => history.map((entry) => ({ product_id: id(productId), cost: entry.cost, changed_at: entry.date })));
const lines = [
  "-- TedarikPro demo verisi / Supabase SQL Editor'da schema.sql sonrasında çalıştırın.",
  "begin;",
  "",
  `insert into public.suppliers (id,name,phone,email,contact) values\n${values(suppliers.map((s) => ({ ...s, id: id(s.id) })), ["id","name","phone","email","contact"])}\non conflict (id) do update set name=excluded.name, phone=excluded.phone, email=excluded.email, contact=excluded.contact;`,
  `insert into public.customers (id,code,name,contact,phone,link_slug) values\n${values(seed.customers.map((c) => ({ ...c, id: id(c.id), link_slug: c.link })), ["id","code","name","contact","phone","link_slug"])}\non conflict (id) do update set code=excluded.code, name=excluded.name, contact=excluded.contact, phone=excluded.phone, link_slug=excluded.link_slug;`,
  `insert into public.warehouses (id,name) values\n${values(seed.warehouses.map((w) => ({ ...w, id: id(w.id) })), ["id","name"])}\non conflict (id) do update set name=excluded.name;`,
  `insert into public.products (id,name,barcode,sku,category,brand,supplier_id,unit,conversion,cost,price,critical_level) values\n${values(products.map((p) => ({ ...p, id: id(p.id), barcode: p.barcode ?? "", category: p.cat, supplier_id: id(p.supplierId), conversion: p.conv, critical_level: p.critical })), ["id","name","barcode","sku","category","brand","supplier_id","unit","conversion","cost","price","critical_level"])}\non conflict (id) do update set name=excluded.name, barcode=excluded.barcode, price=excluded.price, cost=excluded.cost, category=excluded.category, supplier_id=excluded.supplier_id, critical_level=excluded.critical_level;`,
  `insert into public.product_prices (product_id,customer_id,price) values\n${values(products.flatMap((p) => Object.entries(p.prices ?? {}).map(([customerId, price]) => ({ product_id: id(p.id), customer_id: id(customerId), price }))), ["product_id","customer_id","price"])}\non conflict (product_id,customer_id) do update set price=excluded.price;`,
  `insert into public.product_stock (product_id,warehouse_id,quantity) values\n${values(products.flatMap((p) => Object.entries(p.stock ?? {}).map(([warehouseId, quantity]) => ({ product_id: id(p.id), warehouse_id: id(warehouseId), quantity }))), ["product_id","warehouse_id","quantity"])}\non conflict (product_id,warehouse_id) do update set quantity=excluded.quantity;`,
  optional(costRows, `insert into public.cost_history (product_id,cost,changed_at) values\n${values(costRows, ["product_id","cost","changed_at"])};`),
  optional(dynamic.orders, `insert into public.orders (id,order_no,customer_id,status,note,discount,created_at) values\n${values(dynamic.orders.map((o) => ({ id: id(o.id), order_no: o.no, customer_id: id(o.customerId), status: o.status, note: o.note, discount: o.discount, created_at: o.date })), ["id","order_no","customer_id","status","note","discount","created_at"])}\non conflict (id) do update set status=excluded.status, note=excluded.note, discount=excluded.discount;`),
  optional(dynamic.orders.flatMap((o) => o.items), `insert into public.order_items (order_id,product_id,qty,price) values\n${values(dynamic.orders.flatMap((o) => o.items.map((item) => ({ order_id: id(o.id), product_id: id(item.productId), qty: item.qty, price: item.price }))), ["order_id","product_id","qty","price"])};`),
  optional(dynamic.orders.flatMap((o) => o.log), `insert into public.order_logs (order_id,text,created_at) values\n${values(dynamic.orders.flatMap((o) => o.log.map((entry) => ({ order_id: id(o.id), text: entry.text, created_at: entry.date }))), ["order_id","text","created_at"])};`),
  optional(dynamic.payments, `insert into public.payments (id,customer_id,order_id,amount,method,note,created_at) values\n${values(dynamic.payments.map((p) => ({ ...p, id: id(p.id), customer_id: id(p.customerId), order_id: id(p.orderId) })), ["id","customer_id","order_id","amount","method","note","date"])}\non conflict (id) do nothing;`),
  optional(dynamic.movements, `insert into public.stock_movements (id,type,product_id,qty,from_warehouse,to_warehouse,ref,created_at) values\n${values(dynamic.movements.map((m) => ({ ...m, id: id(m.id), product_id: id(m.productId), from_warehouse: id(m.from), to_warehouse: id(m.to), created_at: m.date })), ["id","type","product_id","qty","from_warehouse","to_warehouse","ref","created_at"])}\non conflict (id) do nothing;`),
  optional(dynamic.notifications, `insert into public.notifications (id,order_id,read,created_at) values\n${values(dynamic.notifications.map((n) => ({ ...n, id: id(n.id), order_id: id(n.orderId), created_at: n.date })), ["id","order_id","read","created_at"])}\non conflict (id) do nothing;`),
  "commit;",
];
fs.writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n\n") + "\n");
console.log("supabase/seed.sql oluşturuldu");
