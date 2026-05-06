import { NextRequest, NextResponse } from "next/server";
import { suggestCustomers } from "@/lib/data/customers";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");

  if (!q.trim()) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await suggestCustomers({ q, limit });
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
