import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { itineraries, auditLog } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const rows = await db
    .select({ shareToken: itineraries.shareToken })
    .from(itineraries)
    .where(eq(itineraries.id, id))
    .limit(1);
  if (!rows[0])
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (rows[0].shareToken) {
    return NextResponse.json({ token: rows[0].shareToken });
  }

  const token = randomBytes(18).toString("base64url");
  await db
    .update(itineraries)
    .set({ shareToken: token })
    .where(eq(itineraries.id, id));

  await db.insert(auditLog).values({
    itineraryId: id,
    agentId: user.id,
    action: "share-link-created",
    diff: null,
  });

  return NextResponse.json({ token });
}
