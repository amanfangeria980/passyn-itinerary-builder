import Image from "next/image";
import type { Itinerary } from "@/lib/itinerary-schema";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { BRANDING } from "@/lib/branding";

export function ItineraryView({ data }: { data: Itinerary }) {
  return (
    <div className="space-y-10">
      <Cover data={data} />
      <Flights data={data} />
      <Hotels data={data} />
      <Days data={data} />
      <Pricing data={data} />
      <InclusionsExclusions data={data} />
      <Terms data={data} />
    </div>
  );
}

function Cover({ data }: { data: Itinerary }) {
  return (
    <section className="rounded-xl bg-passyn-green/40 p-8">
      <p className="text-sm uppercase tracking-wide text-passyn-ink/70">
        {BRANDING.agencyName} · Personalised itinerary
      </p>
      <h1 className="font-display text-4xl font-semibold mt-2">
        {data.client.name} · {data.trip.destination}
      </h1>
      <p className="text-sm text-passyn-ink/80 mt-2">
        {formatDate(data.trip.startDate)} → {formatDate(data.trip.endDate)} ·{" "}
        {data.trip.nights} night{data.trip.nights === 1 ? "" : "s"} ·{" "}
        {data.client.travellers} traveller
        {data.client.travellers === 1 ? "" : "s"}
      </p>
    </section>
  );
}

function Flights({ data }: { data: Itinerary }) {
  if (!data.flights.length) return null;
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold mb-4">Flights</h2>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Airline / No.</th>
              <th className="px-4 py-2">From</th>
              <th className="px-4 py-2">To</th>
              <th className="px-4 py-2">PNR</th>
            </tr>
          </thead>
          <tbody>
            {data.flights.map((f, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-3 capitalize">{f.type}</td>
                <td className="px-4 py-3">
                  {f.airline}
                  {f.flightNumber ? ` · ${f.flightNumber}` : ""}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{f.from.city}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.from.airport} · {formatDateTime(f.from.datetime)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{f.to.city}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.to.airport} · {formatDateTime(f.to.datetime)}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {f.pnr ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Hotels({ data }: { data: Itinerary }) {
  if (!data.hotels.length) return null;
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold mb-4">Hotels</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {data.hotels.map((h, i) => (
          <article
            key={i}
            className="rounded-lg overflow-hidden border bg-white"
          >
            <div className="relative aspect-video bg-muted">
              {h.fetchedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={h.fetchedImageUrl}
                  alt={h.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImagePlaceholder label={h.name} />
              )}
            </div>
            <div className="p-4 space-y-1.5">
              <h3 className="font-display text-lg font-semibold">{h.name}</h3>
              <p className="text-xs text-muted-foreground">
                {h.city} · {formatDate(h.checkIn)} → {formatDate(h.checkOut)} ·{" "}
                {h.nights} night{h.nights === 1 ? "" : "s"}
              </p>
              {(h.roomType || h.mealPlan) && (
                <p className="text-xs">
                  {h.roomType ?? ""}
                  {h.roomType && h.mealPlan ? " · " : ""}
                  {h.mealPlan ?? ""}
                </p>
              )}
              {h.description && <p className="text-sm mt-2">{h.description}</p>}
              {h.notes && (
                <p className="text-xs text-muted-foreground italic">
                  {h.notes}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Days({ data }: { data: Itinerary }) {
  if (!data.days.length) return null;
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold mb-4">Day by day</h2>
      <div className="space-y-6">
        {data.days.map((d) => (
          <article
            key={d.dayNumber}
            className="rounded-lg border bg-white p-5"
          >
            <header className="flex items-baseline justify-between border-b pb-3 mb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Day {d.dayNumber} · {formatDate(d.date)}
                </p>
                <h3 className="font-display text-xl font-semibold mt-0.5">
                  {d.title}
                </h3>
              </div>
            </header>
            {d.summary && <p className="text-sm mb-4">{d.summary}</p>}

            <ul className="space-y-4">
              {d.activities.map((a, i) => (
                <li key={i} className="flex gap-4">
                  <div className="w-32 shrink-0 aspect-video rounded overflow-hidden bg-muted">
                    {a.fetchedImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.fetchedImageUrl}
                        alt={a.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlaceholder small label={a.title} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      {a.time && (
                        <span className="text-xs font-medium text-passyn-ink/70 bg-passyn-green/40 px-1.5 py-0.5 rounded">
                          {a.time}
                        </span>
                      )}
                      <h4 className="font-medium">{a.title}</h4>
                      {a.duration && (
                        <span className="text-xs text-muted-foreground">
                          · {a.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {a.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function Pricing({ data }: { data: Itinerary }) {
  if (!data.pricing) return null;
  const p = data.pricing;
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold mb-4">Investment</h2>
      <div className="rounded-lg border bg-white p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-display text-2xl font-semibold">
              {formatINR(p.total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Per person</p>
            <p className="font-display text-2xl font-semibold">
              {formatINR(p.perPerson)}
            </p>
          </div>
        </div>
        {p.breakdown && p.breakdown.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {p.breakdown.map((b, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2">{b.label}</td>
                  <td className="py-2 text-right">{formatINR(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function InclusionsExclusions({ data }: { data: Itinerary }) {
  if (!data.inclusions.length && !data.exclusions.length) return null;
  return (
    <section className="grid md:grid-cols-2 gap-4">
      {data.inclusions.length > 0 && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="font-display text-lg font-semibold mb-2">
            Inclusions
          </h3>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {data.inclusions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {data.exclusions.length > 0 && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="font-display text-lg font-semibold mb-2">
            Exclusions
          </h3>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {data.exclusions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Terms({ data }: { data: Itinerary }) {
  if (!data.termsAndConditions.length) return null;
  return (
    <section className="rounded-lg border bg-white p-5">
      <h3 className="font-display text-lg font-semibold mb-2">
        Terms & Conditions
      </h3>
      <ul className="text-xs space-y-1 list-disc pl-5 text-muted-foreground">
        {data.termsAndConditions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </section>
  );
}

function ImagePlaceholder({
  label,
  small,
}: {
  label: string;
  small?: boolean;
}) {
  return (
    <div
      className={`w-full h-full grid place-items-center bg-passyn-green/20 text-passyn-ink/70 ${small ? "text-[10px]" : "text-xs"} px-2 text-center`}
    >
      <span className="line-clamp-2">{label}</span>
    </div>
  );
}
