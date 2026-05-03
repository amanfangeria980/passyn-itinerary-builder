import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { searchStockMany } from "@/lib/images-stock";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ pexels: [], unsplash: [] });

  const results = await searchStockMany(q, 12);
  return NextResponse.json(results);
}
