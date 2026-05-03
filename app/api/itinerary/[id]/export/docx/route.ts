import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { itineraries } from "@/lib/db/schema";
import { ZItinerary } from "@/lib/itinerary-schema";
import { getCurrentUser } from "@/lib/auth/session";
import { renderItineraryDocx } from "@/lib/export/docx";

export const runtime = "nodejs";
export const maxDuration = 60;

// Tiny 1x1 transparent PNG placeholder so docx ImageRun (which requires PNG)
// always has something. The real branded cover uses the agency name + contact
// block; the logo is a small accent. If you want the real PNG embedded, drop
// a logo.png alongside logo.svg under public/branding/ and we'll prefer it.
async function loadLogo(): Promise<Buffer | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return await readFile(join(process.cwd(), "public", "branding", "logo.png"));
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const rows = await db
    .select({
      contentJson: itineraries.contentJson,
      clientName: itineraries.clientName,
    })
    .from(itineraries)
    .where(eq(itineraries.id, id))
    .limit(1);
  const it = rows[0];
  if (!it?.contentJson)
    return NextResponse.json({ error: "Not generated yet" }, { status: 404 });

  const parsed = ZItinerary.safeParse(it.contentJson);
  if (!parsed.success)
    return NextResponse.json({ error: "Stored JSON invalid" }, { status: 500 });

  const logoBuf = await loadLogo();
  const buf = await renderItineraryDocx(parsed.data, logoBuf);
  const filename = `${it.clientName.replace(/[^a-z0-9]+/gi, "-")}-itinerary.docx`;
  return new Response(buf, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
