import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_public_order", { p_link_slug: body.linkSlug, p_items: body.items, p_note: body.note ?? "" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: "Sipariş oluşturulamadı." }, { status: 500 }); }
}
