import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    shortName?: string;
    color?: string;
    contact?: string;
    notes?: string;
  };

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.shortName !== undefined) patch.short_name = body.shortName.trim();
  if (body.color !== undefined) patch.color = body.color;
  if (body.contact !== undefined) patch.contact = body.contact.trim() || null;
  if (body.notes !== undefined) patch.notes = body.notes.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "无修改内容" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update(patch)
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id, name, short_name, color, contact, notes")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
