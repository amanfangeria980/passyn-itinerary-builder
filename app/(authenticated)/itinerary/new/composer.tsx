"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StagedFile = {
  localId: string;
  file: File;
  previewUrl: string;
  tag: "flight" | "hotel" | "activity" | "other";
  caption: string;
};

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function Composer() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travellers, setTravellers] = useState(2);
  const [rawInput, setRawInput] = useState("");
  const [staged, setStaged] = useState<StagedFile[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: StagedFile[] = [];
    for (const f of Array.from(files)) {
      if (!ACCEPTED.includes(f.type)) continue;
      if (f.size > MAX_BYTES) {
        setError(`"${f.name}" exceeds 10 MB and was skipped.`);
        continue;
      }
      next.push({
        localId: crypto.randomUUID(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        tag: "other",
        caption: "",
      });
    }
    setStaged((prev) => {
      const merged = [...prev, ...next].slice(0, MAX_FILES);
      if (prev.length + next.length > MAX_FILES) {
        setError(`Only ${MAX_FILES} images allowed per itinerary.`);
      }
      return merged;
    });
  }

  function removeStaged(localId: string) {
    setStaged((prev) => {
      const f = prev.find((p) => p.localId === localId);
      if (f) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  }

  function updateStaged(localId: string, patch: Partial<StagedFile>) {
    setStaged((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p)),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    setSubmitting(true);
    try {
      setProgress("Saving itinerary…");
      const createRes = await fetch("/api/itinerary/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          destination: destination.trim(),
          startDate,
          endDate,
          travellers,
          rawInput,
        }),
      });
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create itinerary");
      }
      const { id } = (await createRes.json()) as { id: string };

      for (let i = 0; i < staged.length; i++) {
        const s = staged[i];
        setProgress(`Uploading image ${i + 1} of ${staged.length}…`);
        const fd = new FormData();
        fd.append("file", s.file);
        fd.append("tag", s.tag);
        if (s.caption) fd.append("caption", s.caption);
        const upRes = await fetch(`/api/itinerary/${id}/upload`, {
          method: "POST",
          body: fd,
        });
        if (!upRes.ok) {
          const j = await upRes.json().catch(() => ({}));
          throw new Error(`Upload failed: ${j.error || "unknown"}`);
        }
      }

      setProgress("Reading your itinerary…");
      const parseRes = await fetch(`/api/itinerary/${id}/parse`, {
        method: "POST",
      });
      if (!parseRes.ok) {
        const j = await parseRes.json().catch(() => ({}));
        // Don't lose the user's input: keep them on /itinerary/[id] where raw text is preserved.
        setProgress(null);
        setError(`Saved, but parsing failed: ${j.error || "unknown"}. You can retry from the itinerary page.`);
        router.push(`/itinerary/${id}`);
        router.refresh();
        return;
      }

      setProgress("Done. Redirecting…");
      router.push(`/itinerary/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid lg:grid-cols-3 gap-6">
      {/* Left: composer */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="raw">Trip details</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Paste anything — flight info, hotel names, day-wise plans,
              activities, prices. The parser will normalise it in Phase 2.
            </p>
            <Textarea
              id="raw"
              rows={14}
              placeholder={`e.g.\n\nClient: Mr & Mrs Sharma, 2 adults\nBali, 5N / 6D, 15 Jun → 21 Jun\n\nFlights:\n- 15 Jun: AI 2145 DEL → DPS, 23:45 → 08:30 (+1)\n- 21 Jun: SQ 943 DPS → DEL via SIN\n\nHotels:\n- The Mulia Resort, Nusa Dua, 5N (15-20 Jun), Deluxe Ocean Court, B&B\n\nDay 1: Arrival, transfer, leisure\nDay 2: Uluwatu temple + Kecak fire dance\nDay 3: Ubud — Tegallalang rice terraces, Monkey Forest\n…\n\nTotal: ₹1,85,000 per couple`}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
          </div>

          {/* Drop tray */}
          <div>
            <Label>Attachments</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {staged.length} of {MAX_FILES} images attached. JPG / PNG / WEBP /
              HEIC, 10 MB each.
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="mt-2 rounded-lg border-2 border-dashed border-input p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Drop images here, or
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                >
                  Choose files
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept={ACCEPTED.join(",")}
                  hidden
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {staged.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {staged.map((s) => (
                    <li
                      key={s.localId}
                      className="rounded-md border bg-white p-2 space-y-2"
                    >
                      <div className="relative aspect-video bg-muted rounded overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.previewUrl}
                          alt={s.file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={s.tag}
                          onChange={(e) =>
                            updateStaged(s.localId, {
                              tag: e.target.value as StagedFile["tag"],
                            })
                          }
                          className="text-xs border rounded px-1.5 py-1 bg-background flex-1"
                        >
                          <option value="other">Other</option>
                          <option value="flight">Flight</option>
                          <option value="hotel">Hotel</option>
                          <option value="activity">Activity</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeStaged(s.localId)}
                          className="text-xs text-destructive hover:underline"
                          aria-label={`Remove ${s.file.name}`}
                        >
                          Remove
                        </button>
                      </div>
                      <Input
                        value={s.caption}
                        onChange={(e) =>
                          updateStaged(s.localId, { caption: e.target.value })
                        }
                        placeholder="Caption (optional)"
                        className="h-8 text-xs"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Right: client meta + submit */}
      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Client</h3>
          <div className="space-y-1.5">
            <Label htmlFor="cn">Client name *</Label>
            <Input
              id="cn"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Mr & Mrs Sharma"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ce">Contact email</Label>
            <Input
              id="ce"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dest">Destination</Label>
            <Input
              id="dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Bali, Indonesia"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sd">Start date</Label>
              <Input
                id="sd"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed">End date</Label>
              <Input
                id="ed"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr">Travellers</Label>
            <Input
              id="tr"
              type="number"
              min={1}
              max={50}
              value={travellers}
              onChange={(e) => setTravellers(Number(e.target.value))}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          {progress && (
            <p className="text-sm text-muted-foreground">{progress}</p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Generating…" : "Generate itinerary"}
          </Button>
          <p className="text-xs text-muted-foreground">
            We’ll save your raw notes + uploads, then run them through the
            NVIDIA NIM parser to produce a day-wise itinerary.
          </p>
        </Card>
      </div>
    </form>
  );
}
