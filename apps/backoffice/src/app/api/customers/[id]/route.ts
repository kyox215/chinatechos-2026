import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!env.defaultStoreId) {
    return NextResponse.json({ error: "Missing env: DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const body = (await request.json()) as {
    name?: string;
    consentRequiredNotify?: boolean;
    consentMarketing?: boolean;
    notes?: string;
  };

  const supabase = createSupabaseServerClient();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("name" in body) patch.name = body.name?.trim() || null;
  if ("consentRequiredNotify" in body) patch.consent_required_notify = body.consentRequiredNotify;
  if ("consentMarketing" in body) patch.consent_marketing = body.consentMarketing;
  if ("notes" in body) patch.notes = body.notes?.trim() || null;

  const result = await supabase
    .from("customers")
    .update(patch)
    .eq("id", params.id)
    .eq("store_id", env.defaultStoreId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: result.data.id });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!env.defaultStoreId) {
    return NextResponse.json({ error: "Missing env: DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("store_id", env.defaultStoreId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: result.data.id });
}
