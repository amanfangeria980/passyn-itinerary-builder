import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, itineraries, auditLog } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { parseItinerary } from "@/lib/llm";
import { fillImagesForItinerary } from "@/lib/image-fill";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const rows = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.id, id))
    .limit(1);
  const it = rows[0];
  if (!it) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const att = await db
    .select()
    .from(assets)
    .where(eq(assets.itineraryId, id))
    .orderBy(asc(assets.createdAt));

  const parseRes = await parseItinerary({
    agentId: user.id,
    itineraryId: id,
    input: {
      rawText: it.rawInput ?? "",
      attachments: att.map((a) => ({
        imageId: a.id,
        filename: a.r2Key.split("/").pop() ?? a.id,
        agentTag: a.agentTag,
        agentCaption: a.agentCaption,
      })),
      clientHint: {
        name: it.clientName,
        email: it.clientEmail ?? undefined,
        travellers: it.travellers,
      },
      tripHint: {
        destination: it.destination ?? undefined,
        startDate: it.startDate ?? undefined,
        endDate: it.endDate ?? undefined,
      },
    },
  });

  if (!parseRes.ok) {
    return NextResponse.json(
      { error: `Parser failed: ${parseRes.error}` },
      { status: 502 },
    );
  }

  const filled = await fillImagesForItinerary(parseRes.itinerary, att);

  await db
    .update(itineraries)
    .set({
      contentJson: filled,
      status: "parsed",
      updatedAt: new Date(),
      lastEditedByAgentId: user.id,
      destination: filled.trip.destination ?? it.destination,
      startDate: filled.trip.startDate ?? it.startDate,
      endDate: filled.trip.endDate ?? it.endDate,
    })
    .where(eq(itineraries.id, id));

  await db.insert(auditLog).values({
    itineraryId: id,
    agentId: user.id,
    action: "parse",
    diff: { model: parseRes.model, latencyMs: parseRes.latencyMs },
  });

  return NextResponse.json({ ok: true });
}
