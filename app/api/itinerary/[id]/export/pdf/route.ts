import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { itineraries } from "@/lib/db/schema";
import { ZItinerary } from "@/lib/itinerary-schema";
import { getCurrentUser } from "@/lib/auth/session";
import { renderItineraryPdf } from "@/lib/export/pdf";
import { resolveImageDataUri } from "@/lib/export/resolve-image";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  // Embed local logo as data URL (react-pdf accepts data URLs). Prefer PNG
  // if the agency has dropped a real one in; fall back to the SVG scaffold.
  let logoData: string | undefined;
  for (const file of ["logo.png", "logo.svg"]) {
    try {
      const buf = await readFile(join(process.cwd(), "public", "branding", file));
      const mime = file.endsWith(".png") ? "image/png" : "image/svg+xml";
      logoData = `data:${mime};base64,${buf.toString("base64")}`;
      break;
    } catch {
      /* try next */
    }
  }

  // Pre-resolve every image URL to a data URI so react-pdf doesn't try to
  // self-fetch /api/asset/<id> (relative URLs don't work in server context).
  const data = parsed.data;
  await Promise.all([
    ...data.hotels.map(async (h) => {
      if (h.fetchedImageUrl) {
        h.fetchedImageUrl = (await resolveImageDataUri(h.fetchedImageUrl)) ?? null;
      }
    }),
    ...data.days.flatMap((day) =>
      day.activities.map(async (a) => {
        if (a.fetchedImageUrl) {
          a.fetchedImageUrl = (await resolveImageDataUri(a.fetchedImageUrl)) ?? null;
        }
      }),
    ),
  ]);

  const buf = await renderItineraryPdf(data, logoData);
  const filename = `${it.clientName.replace(/[^a-z0-9]+/gi, "-")}-itinerary.pdf`;
  return new Response(buf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
