import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, itineraries } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { r2Get } from "@/lib/r2";

export const runtime = "nodejs";

// Streams an asset from R2.
//   /api/asset/<id>           → full image
//   /api/asset/<id>?thumb=1   → 400px thumbnail
//
// Access:
//   - Logged-in agents always allowed.
//   - Anyone allowed if the parent itinerary has a share_token (i.e. has been
//     published via "Share link"). This is what lets <img> tags on public
//     /share/[token] pages render images uploaded to R2.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const wantThumb = new URL(req.url).searchParams.get("thumb") === "1";

  const rows = await db
    .select({
      r2Key: assets.r2Key,
      thumbR2Key: assets.thumbR2Key,
      mime: assets.mime,
      itineraryId: assets.itineraryId,
      shareToken: itineraries.shareToken,
    })
    .from(assets)
    .leftJoin(itineraries, eq(itineraries.id, assets.itineraryId))
    .where(eq(assets.id, id))
    .limit(1);
  const a = rows[0];
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auth gate: logged-in agent OR shared itinerary.
  const user = await getCurrentUser();
  if (!user && !a.shareToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = wantThumb ? a.thumbR2Key ?? a.r2Key : a.r2Key;
  const obj = await r2Get(key);
  if (!obj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new Response(obj.body, {
    headers: {
      "content-type": obj.contentType ?? a.mime ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(obj.contentLength ?? obj.body.byteLength),
    },
  });
}
