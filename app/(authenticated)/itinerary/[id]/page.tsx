import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, itineraries, users, auditLog } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { ItineraryView } from "@/components/itinerary-view";
import { ZItinerary } from "@/lib/itinerary-schema";
import { ItineraryToolbar } from "@/components/itinerary-toolbar";

export const dynamic = "force-dynamic";

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await db
    .select({
      id: itineraries.id,
      clientName: itineraries.clientName,
      clientEmail: itineraries.clientEmail,
      destination: itineraries.destination,
      startDate: itineraries.startDate,
      endDate: itineraries.endDate,
      travellers: itineraries.travellers,
      status: itineraries.status,
      rawInput: itineraries.rawInput,
      contentJson: itineraries.contentJson,
      shareToken: itineraries.shareToken,
      createdAt: itineraries.createdAt,
      updatedAt: itineraries.updatedAt,
      createdByName: users.name,
    })
    .from(itineraries)
    .leftJoin(users, eq(users.id, itineraries.createdByAgentId))
    .where(eq(itineraries.id, id))
    .limit(1);

  const it = rows[0];
  if (!it) notFound();

  const att = await db
    .select()
    .from(assets)
    .where(eq(assets.itineraryId, id))
    .orderBy(asc(assets.createdAt));

  const audit = await db
    .select({
      action: auditLog.action,
      at: auditLog.at,
      diff: auditLog.diff,
      agentName: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.agentId))
    .where(eq(auditLog.itineraryId, id))
    .orderBy(desc(auditLog.at))
    .limit(10);

  const parsed = it.contentJson
    ? ZItinerary.safeParse(it.contentJson)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to itineraries
          </Link>
          <h1 className="font-display text-3xl font-semibold mt-1">
            {it.clientName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {it.destination ?? "—"} ·{" "}
            {it.startDate ? formatDate(it.startDate) : "—"}
            {it.startDate && it.endDate ? " → " : ""}
            {it.endDate ? formatDate(it.endDate) : ""} · {it.travellers}{" "}
            traveller{it.travellers === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Created by {it.createdByName ?? "—"} on{" "}
            {formatDateTime(it.createdAt)} · Status: {it.status}
          </p>
        </div>
        <ItineraryToolbar
          itineraryId={it.id}
          hasContent={!!parsed?.success}
          shareToken={it.shareToken}
        />
      </div>

      {parsed?.success ? (
        <ItineraryView data={parsed.data} />
      ) : it.contentJson && parsed && !parsed.success ? (
        <Card className="p-6 border-destructive/50">
          <h2 className="font-display text-lg text-destructive">
            Parsed JSON didn’t match schema
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use “Re-parse” to retry. Raw notes are preserved below.
          </p>
          <pre className="text-xs whitespace-pre-wrap mt-4 max-h-60 overflow-auto bg-muted/40 rounded p-3">
            {JSON.stringify(parsed.error.issues.slice(0, 5), null, 2)}
          </pre>
        </Card>
      ) : (
        <Card className="p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold">Raw notes</h2>
          {it.rawInput ? (
            <pre className="text-sm whitespace-pre-wrap font-sans bg-muted/40 rounded-md p-4">
              {it.rawInput}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              No raw notes were saved.
            </p>
          )}
          <p className="text-xs text-muted-foreground border-t pt-3">
            Click “Generate / Re-parse” above to send these notes through the
            NVIDIA NIM parser.
          </p>
        </Card>
      )}

      {att.length > 0 && (
        <Card className="p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold">
            Agent uploads ({att.length})
          </h2>
          <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {att.map((a) => (
              <li
                key={a.id}
                className="rounded-md overflow-hidden border bg-white"
              >
                <a
                  href={`/api/asset/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/asset/${a.id}?thumb=1`}
                    alt={a.agentCaption ?? ""}
                    className="w-full h-20 object-cover"
                  />
                </a>
                <div className="p-1 text-[10px] text-muted-foreground capitalize text-center">
                  {a.agentTag ?? "other"}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {audit.length > 0 && (
        <Card className="p-6 space-y-2">
          <h2 className="font-display text-lg font-semibold">Activity</h2>
          <ul className="text-sm divide-y">
            {audit.map((a, i) => (
              <li
                key={i}
                className="py-2 flex items-baseline justify-between gap-2"
              >
                <span>
                  <span className="font-medium">{a.agentName ?? "—"}</span>{" "}
                  <span className="text-muted-foreground">— {a.action}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(a.at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
