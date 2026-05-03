import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { itineraries } from "@/lib/db/schema";
import { ZItinerary } from "@/lib/itinerary-schema";
import { ItineraryEditor } from "@/components/editor/itinerary-editor";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.id, id))
    .limit(1);
  const it = rows[0];
  if (!it) notFound();
  if (!it.contentJson) redirect(`/itinerary/${id}`);

  const parsed = ZItinerary.safeParse(it.contentJson);
  if (!parsed.success) redirect(`/itinerary/${id}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/itinerary/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to itinerary
        </Link>
        <p className="text-xs text-muted-foreground">
          Changes are autosaved as you type.
        </p>
      </div>
      <h1 className="font-display text-3xl font-semibold">
        Edit · {parsed.data.client.name}
      </h1>
      <ItineraryEditor itineraryId={id} initial={parsed.data} />
    </div>
  );
}
