import { eq } from "drizzle-orm";
import { db } from "../db";
import { assets } from "../db/schema";
import { r2Get } from "../r2";

// Returns the raw bytes for any image URL we might embed in an export.
// Handles both:
//   - "/api/asset/<id>" / "/api/asset/<id>?thumb=1" → R2 GetObject
//   - "https://images.pexels.com/..." or any other absolute URL → http fetch
export async function resolveImageBytes(
  url: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const proxyMatch = url.match(/^\/api\/asset\/([^?/#]+)/);
    if (proxyMatch) {
      const wantThumb = url.includes("thumb=1");
      const rows = await db
        .select({
          r2Key: assets.r2Key,
          thumbR2Key: assets.thumbR2Key,
          mime: assets.mime,
        })
        .from(assets)
        .where(eq(assets.id, proxyMatch[1]))
        .limit(1);
      const a = rows[0];
      if (!a) return null;
      const key = wantThumb ? a.thumbR2Key ?? a.r2Key : a.r2Key;
      const obj = await r2Get(key);
      if (!obj) return null;
      return {
        body: obj.body,
        contentType: obj.contentType ?? a.mime ?? "image/webp",
      };
    }

    const r = await fetch(url);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    return {
      body: Buffer.from(ab),
      contentType: r.headers.get("content-type") ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function resolveImageDataUri(url: string): Promise<string | null> {
  const r = await resolveImageBytes(url);
  if (!r) return null;
  return `data:${r.contentType};base64,${r.body.toString("base64")}`;
}
