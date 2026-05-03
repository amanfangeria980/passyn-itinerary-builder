import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { itineraries } from "@/lib/db/schema";
import { ZItinerary } from "@/lib/itinerary-schema";
import { ItineraryView } from "@/components/itinerary-view";
import { BRANDING } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const rows = await db
    .select({
      contentJson: itineraries.contentJson,
      clientName: itineraries.clientName,
    })
    .from(itineraries)
    .where(eq(itineraries.shareToken, token))
    .limit(1);
  const it = rows[0];
  if (!it?.contentJson) notFound();
  const parsed = ZItinerary.safeParse(it.contentJson);
  if (!parsed.success) notFound();

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b bg-white">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src={BRANDING.logoPath}
              alt=""
              width={28}
              height={28}
              className="rounded"
            />
            <span className="font-display text-lg font-semibold text-passyn-ink">
              {BRANDING.agencyName}
            </span>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            {BRANDING.email} · {BRANDING.phone}
          </div>
        </div>
      </header>
      <main className="container py-10">
        <ItineraryView data={parsed.data} />
      </main>
      <footer className="border-t bg-white text-center py-6 text-xs text-muted-foreground">
        Prepared by {BRANDING.contactName} · {BRANDING.agencyName}
      </footer>
    </div>
  );
}
