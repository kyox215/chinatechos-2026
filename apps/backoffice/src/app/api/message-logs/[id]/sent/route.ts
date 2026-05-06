import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const params = await context.params;
  const supabase = createSupabaseServerClient();

  const updateRes = await supabase
    .from("message_logs")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("store_id", storeId)
    .select("id, status")
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...updateRes.data });
}
