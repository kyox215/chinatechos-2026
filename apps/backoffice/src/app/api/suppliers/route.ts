import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, short_name, color, contact, notes, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const body = (await request.json()) as {
    name?: string;
    shortName?: string;
    color?: string;
    contact?: string;
    notes?: string;
  };

  if (!body.name?.trim() || !body.shortName?.trim()) {
    return NextResponse.json({ error: "名称和缩写不能为空" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      store_id: storeId,
      name: body.name.trim(),
      short_name: body.shortName.trim(),
      color: body.color ?? "blue",
      contact: body.contact?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select("id, name, short_name, color, contact, notes")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
