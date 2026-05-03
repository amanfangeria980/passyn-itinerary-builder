import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { itineraries, auditLog } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { ZItinerary } from "@/lib/itinerary-schema";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  if (!json) return NextResponse.json({ error: "bad json" }, { status: 400 });

  const parsed = ZItinerary.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  const updated = await db
    .update(itineraries)
    .set({
      contentJson: parsed.data,
      updatedAt: new Date(),
      lastEditedByAgentId: user.id,
      destination: parsed.data.trip.destination,
      startDate: parsed.data.trip.startDate,
      endDate: parsed.data.trip.endDate,
      travellers: parsed.data.client.travellers,
      clientName: parsed.data.client.name,
      clientEmail: parsed.data.client.email ?? null,
      status: "parsed",
    })
    .where(eq(itineraries.id, id))
    .returning({ id: itineraries.id });

  if (!updated[0])
    return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.insert(auditLog).values({
    itineraryId: id,
    agentId: user.id,
    action: "edit",
    diff: null,
  });

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
