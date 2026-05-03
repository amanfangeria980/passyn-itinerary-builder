"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReplaceImage } from "./replace-image";
import { RichText } from "./rich-text";
import type { Activity, Day, Hotel, Itinerary } from "@/lib/itinerary-schema";

type Props = {
  itineraryId: string;
  initial: Itinerary;
};

export function ItineraryEditor({ itineraryId, initial }: Props) {
  const [data, setData] = useState<Itinerary>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const timer = useRef<number | null>(null);

  // Autosave (debounced 1.5s)
  const triggerSave = useCallback(
    (next: Itinerary) => {
      dirtyRef.current = true;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        setSaving(true);
        setError(null);
        try {
          const r = await fetch(`/api/itinerary/${itineraryId}/save`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(next),
          });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error(j.error || `Save failed (${r.status})`);
          }
          const j = await r.json();
          setSavedAt(j.savedAt);
          dirtyRef.current = false;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Save failed";
          setError(msg);
          toast.error(msg);
        } finally {
          setSaving(false);
        }
      }, 1500);
    },
    [itineraryId],
  );

  function update(mutator: (draft: Itinerary) => void) {
    setData((prev) => {
      const next = structuredClone(prev);
      mutator(next);
      triggerSave(next);
      return next;
    });
  }

  // Warn on close if unsaved
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-8">
        <ClientTrip data={data} update={update} />
        <FlightsEdit data={data} update={update} />
        <HotelsEdit data={data} update={update} itineraryId={itineraryId} />
        <DaysEdit data={data} update={update} itineraryId={itineraryId} />
        <PricingEdit data={data} update={update} />
        <ListEdit
          label="Inclusions"
          values={data.inclusions}
          onChange={(v) => update((d) => void (d.inclusions = v))}
        />
        <ListEdit
          label="Exclusions"
          values={data.exclusions}
          onChange={(v) => update((d) => void (d.exclusions = v))}
        />
        <ListEdit
          label="Terms & Conditions"
          values={data.termsAndConditions}
          onChange={(v) => update((d) => void (d.termsAndConditions = v))}
        />
      </div>

      <aside className="lg:sticky lg:top-20 self-start space-y-4">
        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <p className="font-medium">Autosave</p>
          {error ? (
            <p className="text-destructive text-xs">{error}</p>
          ) : saving ? (
            <p className="text-muted-foreground text-xs">Saving…</p>
          ) : savedAt ? (
            <p className="text-muted-foreground text-xs">
              Saved {new Date(savedAt).toLocaleTimeString()}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">No edits yet</p>
          )}
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <p className="font-medium">Quick actions</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              update((d) =>
                void d.days.push({
                  dayNumber: d.days.length + 1,
                  date: d.days.at(-1)?.date ?? d.trip.startDate,
                  title: "Untitled day",
                  summary: "",
                  activities: [],
                }),
              )
            }
          >
            + Add day
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              update((d) =>
                void d.hotels.push({
                  name: "New hotel",
                  city: d.trip.destination ?? "",
                  checkIn: d.trip.startDate,
                  checkOut: d.trip.endDate,
                  nights: 1,
                  description: "",
                }),
              )
            }
          >
            + Add hotel
          </Button>
        </div>
      </aside>
    </div>
  );
}

function ClientTrip({
  data,
  update,
}: {
  data: Itinerary;
  update: (m: (d: Itinerary) => void) => void;
}) {
  return (
    <section className="rounded-lg border bg-white p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Field label="Client name">
        <Input
          value={data.client.name}
          onChange={(e) =>
            update((d) => void (d.client.name = e.target.value))
          }
        />
      </Field>
      <Field label="Travellers">
        <Input
          type="number"
          min={1}
          value={data.client.travellers}
          onChange={(e) =>
            update(
              (d) =>
                void (d.client.travellers = Math.max(
                  1,
                  Number(e.target.value),
                )),
            )
          }
        />
      </Field>
      <Field label="Destination">
        <Input
          value={data.trip.destination}
          onChange={(e) =>
            update((d) => void (d.trip.destination = e.target.value))
          }
        />
      </Field>
      <Field label="Nights">
        <Input
          type="number"
          min={0}
          value={data.trip.nights}
          onChange={(e) =>
            update(
              (d) =>
                void (d.trip.nights = Math.max(0, Number(e.target.value))),
            )
          }
        />
      </Field>
      <Field label="Start date">
        <Input
          type="date"
          value={data.trip.startDate}
          onChange={(e) =>
            update((d) => void (d.trip.startDate = e.target.value))
          }
        />
      </Field>
      <Field label="End date">
        <Input
          type="date"
          value={data.trip.endDate}
          onChange={(e) =>
            update((d) => void (d.trip.endDate = e.target.value))
          }
        />
      </Field>
      <Field label="Client email">
        <Input
          type="email"
          value={data.client.email ?? ""}
          onChange={(e) =>
            update((d) => void (d.client.email = e.target.value || null))
          }
        />
      </Field>
    </section>
  );
}

function FlightsEdit({
  data,
  update,
}: {
  data: Itinerary;
  update: (m: (d: Itinerary) => void) => void;
}) {
  return (
    <section>
      <SectionHeader
        title="Flights"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update(
                (d) =>
                  void d.flights.push({
                    type: "outbound",
                    airline: "",
                    flightNumber: null,
                    pnr: null,
                    from: { city: "", airport: "", datetime: "" },
                    to: { city: "", airport: "", datetime: "" },
                  }),
              )
            }
          >
            + Add flight
          </Button>
        }
      />
      <div className="space-y-3">
        {data.flights.map((f, i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Type">
                <select
                  value={f.type}
                  onChange={(e) =>
                    update(
                      (d) =>
                        void (d.flights[i].type = e.target
                          .value as "outbound" | "return" | "internal"),
                    )
                  }
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="outbound">Outbound</option>
                  <option value="return">Return</option>
                  <option value="internal">Internal</option>
                </select>
              </Field>
              <Field label="Airline">
                <Input
                  value={f.airline}
                  onChange={(e) =>
                    update((d) => void (d.flights[i].airline = e.target.value))
                  }
                />
              </Field>
              <Field label="Flight no.">
                <Input
                  value={f.flightNumber ?? ""}
                  onChange={(e) =>
                    update(
                      (d) =>
                        void (d.flights[i].flightNumber =
                          e.target.value || null),
                    )
                  }
                />
              </Field>
              <Field label="PNR">
                <Input
                  value={f.pnr ?? ""}
                  onChange={(e) =>
                    update(
                      (d) => void (d.flights[i].pnr = e.target.value || null),
                    )
                  }
                />
              </Field>
              <Field label="From city">
                <Input
                  value={f.from.city}
                  onChange={(e) =>
                    update(
                      (d) => void (d.flights[i].from.city = e.target.value),
                    )
                  }
                />
              </Field>
              <Field label="From airport">
                <Input
                  value={f.from.airport}
                  onChange={(e) =>
                    update(
                      (d) =>
                        void (d.flights[i].from.airport = e.target.value),
                    )
                  }
                />
              </Field>
              <Field label="Departure">
                <Input
                  type="datetime-local"
                  value={f.from.datetime?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    update(
                      (d) =>
                        void (d.flights[i].from.datetime = e.target.value),
                    )
                  }
                />
              </Field>
              <Field label="To city">
                <Input
                  value={f.to.city}
                  onChange={(e) =>
                    update((d) => void (d.flights[i].to.city = e.target.value))
                  }
                />
              </Field>
              <Field label="To airport">
                <Input
                  value={f.to.airport}
                  onChange={(e) =>
                    update(
                      (d) => void (d.flights[i].to.airport = e.target.value),
                    )
                  }
                />
              </Field>
              <Field label="Arrival">
                <Input
                  type="datetime-local"
                  value={f.to.datetime?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    update(
                      (d) => void (d.flights[i].to.datetime = e.target.value),
                    )
                  }
                />
              </Field>
            </div>
            <div className="flex justify-end mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  update((d) => void d.flights.splice(i, 1))
                }
                className="text-destructive"
              >
                Delete flight
              </Button>
            </div>
          </div>
        ))}
        {data.flights.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No flights yet.
          </p>
        )}
      </div>
    </section>
  );
}

function HotelsEdit({
  data,
  update,
  itineraryId,
}: {
  data: Itinerary;
  update: (m: (d: Itinerary) => void) => void;
  itineraryId: string;
}) {
  return (
    <section>
      <SectionHeader title="Hotels" />
      <div className="grid md:grid-cols-2 gap-4">
        {data.hotels.map((h, i) => (
          <HotelCard
            key={i}
            hotel={h}
            itineraryId={itineraryId}
            destination={data.trip.destination}
            onChange={(next) => update((d) => void (d.hotels[i] = next))}
            onRemove={() => update((d) => void d.hotels.splice(i, 1))}
          />
        ))}
        {data.hotels.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No hotels yet.</p>
        )}
      </div>
    </section>
  );
}

function HotelCard({
  hotel,
  destination,
  itineraryId,
  onChange,
  onRemove,
}: {
  hotel: Hotel;
  destination: string;
  itineraryId: string;
  onChange: (h: Hotel) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-lg border bg-white overflow-hidden">
      <div className="relative aspect-video bg-muted">
        {hotel.fetchedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.fetchedImageUrl}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid place-items-center bg-passyn-green/20 text-passyn-ink/70 text-xs px-2 text-center">
            No image yet — click below to add one.
          </div>
        )}
        <div className="absolute right-2 bottom-2">
          <ReplaceImage
            itineraryId={itineraryId}
            initialQuery={`${hotel.description ?? hotel.name} ${hotel.city || destination}`.trim()}
            current={hotel.fetchedImageUrl ?? null}
            onChange={(next) =>
              onChange({
                ...hotel,
                fetchedImageUrl: next?.url ?? null,
                fetchedImageSource: next?.source ?? null,
              })
            }
          />
        </div>
      </div>
      <div className="p-4 space-y-2">
        <Field label="Name">
          <Input
            value={hotel.name}
            onChange={(e) => onChange({ ...hotel, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="City">
            <Input
              value={hotel.city}
              onChange={(e) => onChange({ ...hotel, city: e.target.value })}
            />
          </Field>
          <Field label="Nights">
            <Input
              type="number"
              min={0}
              value={hotel.nights}
              onChange={(e) =>
                onChange({ ...hotel, nights: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Check-in">
            <Input
              type="date"
              value={hotel.checkIn}
              onChange={(e) => onChange({ ...hotel, checkIn: e.target.value })}
            />
          </Field>
          <Field label="Check-out">
            <Input
              type="date"
              value={hotel.checkOut}
              onChange={(e) => onChange({ ...hotel, checkOut: e.target.value })}
            />
          </Field>
          <Field label="Room">
            <Input
              value={hotel.roomType ?? ""}
              onChange={(e) =>
                onChange({ ...hotel, roomType: e.target.value || null })
              }
            />
          </Field>
          <Field label="Meal plan">
            <Input
              value={hotel.mealPlan ?? ""}
              onChange={(e) =>
                onChange({ ...hotel, mealPlan: e.target.value || null })
              }
            />
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            rows={3}
            value={hotel.description ?? ""}
            onChange={(e) =>
              onChange({ ...hotel, description: e.target.value })
            }
          />
        </Field>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={onRemove}
          >
            Remove hotel
          </Button>
        </div>
      </div>
    </article>
  );
}

function DaysEdit({
  data,
  update,
  itineraryId,
}: {
  data: Itinerary;
  update: (m: (d: Itinerary) => void) => void;
  itineraryId: string;
}) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = useMemo(() => data.days.map((d) => `day-${d.dayNumber}`), [data.days]);

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = ids.indexOf(String(e.active.id));
    const newIdx = ids.indexOf(String(e.over.id));
    update((d) => {
      d.days = arrayMove(d.days, oldIdx, newIdx).map((day, i) => ({
        ...day,
        dayNumber: i + 1,
      }));
    });
  }

  return (
    <section>
      <SectionHeader title="Day by day" subtitle="Drag the handle to reorder." />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {data.days.map((day, i) => (
              <SortableDay
                key={ids[i]}
                id={ids[i]}
                day={day}
                destination={data.trip.destination}
                itineraryId={itineraryId}
                onChange={(next) => update((d) => void (d.days[i] = next))}
                onRemove={() =>
                  update((d) => {
                    d.days.splice(i, 1);
                    d.days = d.days.map((dd, idx) => ({
                      ...dd,
                      dayNumber: idx + 1,
                    }));
                  })
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SortableDay({
  id,
  day,
  destination,
  itineraryId,
  onChange,
  onRemove,
}: {
  id: string;
  day: Day;
  destination: string;
  itineraryId: string;
  onChange: (d: Day) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-white p-4"
    >
      <header className="flex items-center justify-between gap-3 mb-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground select-none"
          aria-label="Drag to reorder"
          type="button"
        >
          ⠿
        </button>
        <div className="flex-1 grid sm:grid-cols-3 gap-2">
          <Field label={`Day ${day.dayNumber} title`}>
            <Input
              value={day.title}
              onChange={(e) => onChange({ ...day, title: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={day.date}
              onChange={(e) => onChange({ ...day, date: e.target.value })}
            />
          </Field>
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive ml-auto"
              onClick={onRemove}
            >
              Delete day
            </Button>
          </div>
        </div>
      </header>

      <Field label="Summary">
        <RichText
          value={day.summary}
          onChange={(v) => onChange({ ...day, summary: v })}
          placeholder="Write a short summary of the day…"
        />
      </Field>

      <ActivitiesEdit
        day={day}
        destination={destination}
        itineraryId={itineraryId}
        onChange={(activities) => onChange({ ...day, activities })}
      />
    </article>
  );
}

function ActivitiesEdit({
  day,
  destination,
  itineraryId,
  onChange,
}: {
  day: Day;
  destination: string;
  itineraryId: string;
  onChange: (a: Activity[]) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Activities</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...day.activities,
              {
                title: "New activity",
                description: "",
                time: null,
                duration: null,
              },
            ])
          }
        >
          + Add activity
        </Button>
      </div>
      <ul className="space-y-3">
        {day.activities.map((a, i) => (
          <li key={i} className="rounded-md border p-3 flex gap-3">
            <div className="w-32 shrink-0 space-y-1">
              <div className="aspect-video rounded overflow-hidden bg-muted">
                {a.fetchedImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.fetchedImageUrl}
                    alt={a.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[10px] text-muted-foreground p-1 text-center">
                    No image
                  </div>
                )}
              </div>
              <ReplaceImage
                itineraryId={itineraryId}
                initialQuery={`${a.title} ${destination}`.trim()}
                current={a.fetchedImageUrl ?? null}
                onChange={(next) => {
                  const copy = [...day.activities];
                  copy[i] = {
                    ...a,
                    fetchedImageUrl: next?.url ?? null,
                    fetchedImageSource: next?.source ?? null,
                  };
                  onChange(copy);
                }}
                triggerLabel="Image"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Field label="Time">
                  <Input
                    placeholder="09:00 / Morning"
                    value={a.time ?? ""}
                    onChange={(e) => {
                      const copy = [...day.activities];
                      copy[i] = { ...a, time: e.target.value || null };
                      onChange(copy);
                    }}
                  />
                </Field>
                <Field label="Duration">
                  <Input
                    placeholder="2 hrs"
                    value={a.duration ?? ""}
                    onChange={(e) => {
                      const copy = [...day.activities];
                      copy[i] = { ...a, duration: e.target.value || null };
                      onChange(copy);
                    }}
                  />
                </Field>
                <div className="flex items-end justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      const copy = [...day.activities];
                      copy.splice(i, 1);
                      onChange(copy);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <Field label="Title">
                <Input
                  value={a.title}
                  onChange={(e) => {
                    const copy = [...day.activities];
                    copy[i] = { ...a, title: e.target.value };
                    onChange(copy);
                  }}
                />
              </Field>
              <Field label="Description">
                <RichText
                  value={a.description}
                  onChange={(v) => {
                    const copy = [...day.activities];
                    copy[i] = { ...a, description: v };
                    onChange(copy);
                  }}
                  placeholder="What does the guest experience?"
                />
              </Field>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingEdit({
  data,
  update,
}: {
  data: Itinerary;
  update: (m: (d: Itinerary) => void) => void;
}) {
  const p = data.pricing ?? { currency: "INR" };
  return (
    <section>
      <SectionHeader title="Pricing" />
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Total (INR)">
            <Input
              type="number"
              value={p.total ?? ""}
              onChange={(e) =>
                update((d) => {
                  d.pricing = {
                    ...(d.pricing ?? { currency: "INR" }),
                    total: e.target.value === "" ? null : Number(e.target.value),
                  };
                })
              }
            />
          </Field>
          <Field label="Per person (INR)">
            <Input
              type="number"
              value={p.perPerson ?? ""}
              onChange={(e) =>
                update((d) => {
                  d.pricing = {
                    ...(d.pricing ?? { currency: "INR" }),
                    perPerson:
                      e.target.value === "" ? null : Number(e.target.value),
                  };
                })
              }
            />
          </Field>
          <Field label="Currency">
            <Input
              value={p.currency ?? "INR"}
              onChange={(e) =>
                update((d) => {
                  d.pricing = {
                    ...(d.pricing ?? { currency: "INR" }),
                    currency: e.target.value,
                  };
                })
              }
            />
          </Field>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Breakdown</p>
          {(p.breakdown ?? []).map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2">
              <Input
                value={b.label}
                onChange={(e) =>
                  update((d) => {
                    if (!d.pricing?.breakdown) return;
                    d.pricing.breakdown[i].label = e.target.value;
                  })
                }
              />
              <Input
                type="number"
                value={b.amount}
                onChange={(e) =>
                  update((d) => {
                    if (!d.pricing?.breakdown) return;
                    d.pricing.breakdown[i].amount = Number(e.target.value);
                  })
                }
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() =>
                  update((d) => {
                    d.pricing?.breakdown?.splice(i, 1);
                  })
                }
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update((d) => {
                d.pricing = d.pricing ?? { currency: "INR" };
                d.pricing.breakdown = [
                  ...(d.pricing.breakdown ?? []),
                  { label: "", amount: 0 },
                ];
              })
            }
          >
            + Add line
          </Button>
        </div>
      </div>
    </section>
  );
}

function ListEdit({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <section>
      <SectionHeader title={label} />
      <div className="rounded-lg border bg-white p-4 space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={v}
              onChange={(e) => {
                const c = [...values];
                c[i] = e.target.value;
                onChange(c);
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...values, ""])}
        >
          + Add
        </Button>
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
