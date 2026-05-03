import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, itineraries } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { r2Put } from "@/lib/r2";
import {
  ACCEPTED_MIMES,
  MAX_BYTES,
  MAX_IMAGES_PER_ITINERARY,
  newAssetKey,
  processImage,
} from "@/lib/images";

export const runtime = "nodejs";

const VALID_TAGS = new Set(["flight", "hotel", "activity", "other"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: itineraryId } = await ctx.params;

  // Confirm itinerary exists.
  const it = await db
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(eq(itineraries.id, itineraryId))
    .limit(1);
  if (!it[0]) {
    return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
  }

  // Cap total images per itinerary.
  const countRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(assets)
    .where(eq(assets.itineraryId, itineraryId));
  const existing = countRows[0]?.c ?? 0;

  const form = await req.formData();
  const file = form.get("file");
  const tag = (form.get("tag") as string | null) ?? "other";
  const caption = (form.get("caption") as string | null) ?? null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!VALID_TAGS.has(tag)) {
    return NextResponse.json({ error: "invalid tag" }, { status: 400 });
  }
  if (existing >= MAX_IMAGES_PER_ITINERARY) {
    return NextResponse.json(
      { error: `Max ${MAX_IMAGES_PER_ITINERARY} images per itinerary` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds 10 MB" }, { status: 400 });
  }
  if (!ACCEPTED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: "Only jpg, png, webp, heic accepted" },
      { status: 400 },
    );
  }

  const inputBuf = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processImage(inputBuf);
  } catch {
    return NextResponse.json({ error: "Could not process image" }, { status: 400 });
  }

  const fullKey = newAssetKey(itineraryId, "full");
  const thumbKey = newAssetKey(itineraryId, "thumb");

  await Promise.all([
    r2Put({ key: fullKey, body: processed.full.buffer, contentType: processed.full.mime }),
    r2Put({ key: thumbKey, body: processed.thumb.buffer, contentType: processed.thumb.mime }),
  ]);

  // Insert with placeholder URLs first, then patch with /api/asset/<id> using
  // the row's UUID. We always serve via the proxy so reads work regardless of
  // R2 bucket public-access settings.
  const [row] = await db
    .insert(assets)
    .values({
      itineraryId,
      r2Key: fullKey,
      publicUrl: "",
      thumbR2Key: thumbKey,
      thumbPublicUrl: "",
      mime: processed.full.mime,
      bytes: processed.full.bytes,
      width: processed.full.width,
      height: processed.full.height,
      agentTag: tag,
      agentCaption: caption,
    })
    .returning();

  const proxyUrl = `/api/asset/${row.id}`;
  const proxyThumb = `/api/asset/${row.id}?thumb=1`;
  await db
    .update(assets)
    .set({ publicUrl: proxyUrl, thumbPublicUrl: proxyThumb })
    .where(eq(assets.id, row.id));
  row.publicUrl = proxyUrl;
  row.thumbPublicUrl = proxyThumb;

  // Touch itinerary updated_at.
  await db
    .update(itineraries)
    .set({ updatedAt: new Date(), lastEditedByAgentId: user.id })
    .where(eq(itineraries.id, itineraryId));

  return NextResponse.json({
    asset: {
      id: row.id,
      url: row.publicUrl,
      thumbUrl: row.thumbPublicUrl,
      tag: row.agentTag,
      caption: row.agentCaption,
      width: row.width,
      height: row.height,
    },
  });
}
