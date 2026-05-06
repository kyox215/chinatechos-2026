import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!env.defaultStoreId) {
    return NextResponse.json({ error: "Missing env: DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const supabase = createSupabaseServerClient();

  const updateRes = await supabase
    .from("message_logs")
    .update({ status: "opened", opened_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("store_id", env.defaultStoreId)
    .select("id, status")
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...updateRes.data });
}
