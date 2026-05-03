import { db } from "./db";
import { imageCache } from "./db/schema";
import { eq } from "drizzle-orm";

const CACHE_DAYS = 30;

export type StockResult = {
  url: string;
  source: "pexels" | "unsplash";
  thumb?: string;
  alt?: string;
};

async function searchPexels(query: string): Promise<StockResult | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.pexels.com/v1/search?per_page=8&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos: Array<{ src: { large2x: string; medium: string }; alt?: string }>;
    };
    const first = data.photos?.[0];
    if (!first) return null;
    return {
      url: first.src.large2x,
      thumb: first.src.medium,
      alt: first.alt,
      source: "pexels",
    };
  } catch {
    return null;
  }
}

async function searchUnsplash(query: string): Promise<StockResult | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?per_page=8&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results: Array<{
        urls: { regular: string; small: string };
        alt_description?: string;
      }>;
    };
    const first = data.results?.[0];
    if (!first) return null;
    return {
      url: first.urls.regular,
      thumb: first.urls.small,
      alt: first.alt_description ?? undefined,
      source: "unsplash",
    };
  } catch {
    return null;
  }
}

export async function searchStockMany(
  query: string,
  limit = 8,
): Promise<{ pexels: StockResult[]; unsplash: StockResult[] }> {
  const out = { pexels: [] as StockResult[], unsplash: [] as StockResult[] };
  const pkey = process.env.PEXELS_API_KEY;
  const ukey = process.env.UNSPLASH_ACCESS_KEY;

  await Promise.all([
    (async () => {
      if (!pkey) return;
      try {
        const url = `https://api.pexels.com/v1/search?per_page=${limit}&query=${encodeURIComponent(query)}`;
        const r = await fetch(url, { headers: { Authorization: pkey } });
        if (!r.ok) return;
        const j = (await r.json()) as {
          photos: Array<{ src: { large2x: string; medium: string }; alt?: string }>;
        };
        out.pexels = (j.photos ?? []).map((p) => ({
          url: p.src.large2x,
          thumb: p.src.medium,
          alt: p.alt,
          source: "pexels" as const,
        }));
      } catch { /* ignore */ }
    })(),
    (async () => {
      if (!ukey) return;
      try {
        const url = `https://api.unsplash.com/search/photos?per_page=${limit}&query=${encodeURIComponent(query)}`;
        const r = await fetch(url, {
          headers: { Authorization: `Client-ID ${ukey}` },
        });
        if (!r.ok) return;
        const j = (await r.json()) as {
          results: Array<{
            urls: { regular: string; small: string };
            alt_description?: string;
          }>;
        };
        out.unsplash = (j.results ?? []).map((p) => ({
          url: p.urls.regular,
          thumb: p.urls.small,
          alt: p.alt_description ?? undefined,
          source: "unsplash" as const,
        }));
      } catch { /* ignore */ }
    })(),
  ]);
  return out;
}

export async function findStockImage(query: string): Promise<StockResult | null> {
  const norm = query.trim().toLowerCase();
  if (!norm) return null;

  // Cache lookup
  try {
    const rows = await db
      .select()
      .from(imageCache)
      .where(eq(imageCache.query, norm))
      .limit(1);
    const row = rows[0];
    if (row) {
      const ageMs = Date.now() - new Date(row.fetchedAt).getTime();
      if (ageMs < CACHE_DAYS * 24 * 60 * 60 * 1000) {
        return {
          url: row.url,
          source: row.source as "pexels" | "unsplash",
        };
      }
    }
  } catch { /* cache miss is fine */ }

  // Pexels first, then Unsplash
  const pex = await searchPexels(norm);
  const result = pex ?? (await searchUnsplash(norm));
  if (!result) return null;

  try {
    await db
      .insert(imageCache)
      .values({ query: norm, source: result.source, url: result.url })
      .onConflictDoNothing();
  } catch { /* ignore cache write errors */ }

  return result;
}

export function broadenQuery(query: string, destination?: string): string {
  // Drop hotel/brand specifics; keep destination + a category hint
  const lower = query.toLowerCase();
  const cat = lower.includes("beach")
    ? "beach"
    : lower.includes("temple")
      ? "temple"
      : lower.includes("mountain") || lower.includes("hill")
        ? "mountains"
        : "landmark";
  return [destination, cat, "travel"].filter(Boolean).join(" ");
}
