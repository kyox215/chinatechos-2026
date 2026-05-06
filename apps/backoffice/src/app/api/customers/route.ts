import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!env.defaultStoreId) {
    return NextResponse.json({ error: "Missing env: DEFAULT_STORE_ID" }, { status: 500 });
  }

  const body = (await request.json()) as {
    name?: string;
    phone: string;
    consentRequiredNotify?: boolean;
    consentMarketing?: boolean;
    notes?: string;
  };

  if (!body.phone?.trim()) {
    return NextResponse.json({ error: "电话号码不能为空" }, { status: 400 });
  }

  const phoneE164 = normalizePhone(body.phone.trim());
  const supabase = createSupabaseServerClient();

  // Check for existing (including soft-deleted)
  const existing = await supabase
    .from("customers")
    .select("id, deleted_at")
    .eq("store_id", env.defaultStoreId)
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  if (existing.data && !existing.data.deleted_at) {
    return NextResponse.json(
      { error: "该电话号码已存在客户", existingId: existing.data.id },
      { status: 409 },
    );
  }

  // If soft-deleted, reactivate
  if (existing.data && existing.data.deleted_at) {
    const reactivated = await supabase
      .from("customers")
      .update({
        name: body.name?.trim() || null,
        phone_raw: body.phone.trim(),
        consent_required_notify: body.consentRequiredNotify ?? true,
        consent_marketing: body.consentMarketing ?? false,
        notes: body.notes?.trim() || null,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id)
      .select("id")
      .single();

    if (reactivated.error) {
      return NextResponse.json({ error: reactivated.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: reactivated.data.id, reactivated: true }, { status: 201 });
  }

  const result = await supabase
    .from("customers")
    .insert({
      store_id: env.defaultStoreId,
      name: body.name?.trim() || null,
      phone_raw: body.phone.trim(),
      phone_e164: phoneE164,
      consent_required_notify: body.consentRequiredNotify ?? true,
      consent_marketing: body.consentMarketing ?? false,
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: result.data.id }, { status: 201 });
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^+\d]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("39")) return `+${digits}`;
  return `+39${digits}`;
}
