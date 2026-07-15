import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const requestLog = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function isRateLimited(request: Request) {
  const now = Date.now();
  if (requestLog.size > 10_000) for (const [key, value] of requestLog) if (value.resetAt <= now) requestLog.delete(key);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "unknown";
  const current = requestLog.get(key);
  if (!current || current.resetAt <= now) {
    requestLog.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(request)) return NextResponse.json({ error: "Çok fazla istek gönderildi. Lütfen biraz bekleyin." }, { status: 429 });
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 100_000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
    const body = await request.json();
    if (!body || typeof body.linkSlug !== "string" || body.linkSlug.length < 1 || body.linkSlug.length > 160 || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > 200) {
      return NextResponse.json({ error: "Geçersiz sipariş verisi." }, { status: 400 });
    }
    if (body.items.some((item: unknown) => !item || typeof item !== "object" || typeof (item as { productId?: unknown }).productId !== "string" || !Number.isFinite(Number((item as { qty?: unknown }).qty)) || Number((item as { qty?: unknown }).qty) <= 0)) {
      return NextResponse.json({ error: "Geçersiz ürün adedi." }, { status: 400 });
    }
    if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 2000)) return NextResponse.json({ error: "Not çok uzun." }, { status: 400 });
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_public_order", { p_link_slug: body.linkSlug, p_items: body.items, p_note: body.note ?? "" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: "Sipariş oluşturulamadı." }, { status: 500 }); }
}
