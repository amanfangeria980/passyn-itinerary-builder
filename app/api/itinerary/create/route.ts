import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { itineraries, auditLog } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const Body = z.object({
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email().optional().or(z.literal("")),
  destination: z.string().max(200).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  travellers: z.number().int().positive().max(50).default(1),
  rawInput: z.string().max(50_000).default(""),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [row] = await db
    .insert(itineraries)
    .values({
      createdByAgentId: user.id,
      lastEditedByAgentId: user.id,
      clientName: body.clientName,
      clientEmail: body.clientEmail || null,
      destination: body.destination || null,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      travellers: body.travellers,
      status: "draft",
      rawInput: body.rawInput || null,
    })
    .returning({ id: itineraries.id });

  await db.insert(auditLog).values({
    itineraryId: row.id,
    agentId: user.id,
    action: "create",
    diff: { clientName: body.clientName },
  });

  return NextResponse.json({ id: row.id });
}
