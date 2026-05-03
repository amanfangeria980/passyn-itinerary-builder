import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { itineraries, users } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const rows = await db
    .select({
      id: itineraries.id,
      clientName: itineraries.clientName,
      destination: itineraries.destination,
      startDate: itineraries.startDate,
      endDate: itineraries.endDate,
      status: itineraries.status,
      updatedAt: itineraries.updatedAt,
      lastEditedByName: users.name,
    })
    .from(itineraries)
    .leftJoin(users, eq(users.id, itineraries.lastEditedByAgentId))
    .orderBy(desc(itineraries.updatedAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Itineraries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All itineraries from the team. {rows.length} total.
          </p>
        </div>
        <Link href="/itinerary/new">
          <Button>+ New itinerary</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No itineraries yet. Create the first one.
          </p>
          <div className="mt-4">
            <Link href="/itinerary/new">
              <Button>+ New itinerary</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Travel dates</th>
                <th className="px-4 py-3">Last edited by</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-passyn-green/10 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/itinerary/${r.id}`}
                      className="hover:underline underline-offset-4"
                    >
                      {r.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.destination ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.startDate ? formatDate(r.startDate) : "—"}
                    {r.startDate && r.endDate ? " → " : ""}
                    {r.endDate ? formatDate(r.endDate) : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.lastEditedByName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(r.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    parsed: "bg-passyn-green/40 text-passyn-ink",
    final: "bg-passyn-green text-passyn-ink",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? styles.draft
      }`}
    >
      {status}
    </span>
  );
}
