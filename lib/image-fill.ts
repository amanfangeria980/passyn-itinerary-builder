import type { Itinerary } from "./itinerary-schema";
import type { Asset } from "./db/schema";
import { broadenQuery, findStockImage } from "./images-stock";

// Resolve a hotel/activity to an image: agent attachment > stock match > broadened > null.
// All lookups run concurrently — for a typical itinerary that's 10–15 image fetches
// in parallel (Pexels + Unsplash + DB cache), turning a ~30-60s sequential pass
// into ~3-5s.
export async function fillImagesForItinerary(
  it: Itinerary,
  attachments: Asset[],
): Promise<Itinerary> {
  const byId = new Map(attachments.map((a) => [a.id, a] as const));

  const hotelTasks = it.hotels.map(async (h) => {
    if (h.attachedImageId && byId.has(h.attachedImageId)) {
      h.fetchedImageUrl = `/api/asset/${h.attachedImageId}`;
      h.fetchedImageSource = null;
      return;
    }
    if (h.fetchedImageUrl) return;

    const desc = (h.description ?? "").trim();
    const q1 = [desc, h.city].filter(Boolean).join(" ").trim();
    const q1Result = q1 ? await findStockImage(q1) : null;
    if (q1Result) {
      h.fetchedImageUrl = q1Result.url;
      h.fetchedImageSource = q1Result.source;
      return;
    }
    const q2 = broadenQuery(desc || h.name, it.trip.destination || h.city);
    const q2Result = await findStockImage(q2);
    if (q2Result) {
      h.fetchedImageUrl = q2Result.url;
      h.fetchedImageSource = q2Result.source;
    }
  });

  const activityTasks: Promise<void>[] = [];
  for (const day of it.days) {
    for (const a of day.activities) {
      activityTasks.push(
        (async () => {
          if (a.attachedImageId && byId.has(a.attachedImageId)) {
            a.fetchedImageUrl = `/api/asset/${a.attachedImageId}`;
            a.fetchedImageSource = null;
            return;
          }
          if (a.fetchedImageUrl) return;
          const q = `${a.title} ${it.trip.destination ?? ""}`.trim();
          const r = q ? await findStockImage(q) : null;
          if (r) {
            a.fetchedImageUrl = r.url;
            a.fetchedImageSource = r.source;
          }
        })(),
      );
    }
  }

  await Promise.all([...hotelTasks, ...activityTasks]);
  return it;
}
