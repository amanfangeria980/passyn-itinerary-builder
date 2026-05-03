"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab = "upload" | "url" | "stock";

export type StockHit = {
  url: string;
  thumb?: string;
  alt?: string;
  source: "pexels" | "unsplash";
};

export function ReplaceImage({
  itineraryId,
  initialQuery,
  current,
  onChange,
  triggerLabel = "Replace image",
}: {
  itineraryId: string;
  initialQuery: string;
  current: string | null;
  onChange: (
    next: { url: string; source: "pexels" | "unsplash" | "manual-url" } | null,
  ) => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("stock");
  const [pasteUrl, setPasteUrl] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{
    pexels: StockHit[];
    unsplash: StockHit[];
  }>({ pexels: [], unsplash: [] });
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function runSearch(q: string) {
    setSearching(true);
    try {
      const r = await fetch(`/api/stock-search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setResults(j);
    } finally {
      setSearching(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tag", "other");
      const r = await fetch(`/api/itinerary/${itineraryId}/upload`, {
        method: "POST",
        body: fd,
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(`Upload failed: ${j.error}`);
        return;
      }
      const { asset } = await r.json();
      onChange({ url: asset.url, source: "manual-url" });
      setOpen(false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            setTab("stock");
            setQuery(initialQuery);
            if (initialQuery) runSearch(initialQuery);
          }}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Replace image</DialogTitle>

        <div className="mt-3 flex border-b text-sm">
          {(["upload", "url", "stock"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 -mb-px capitalize border-b-2 ${
                tab === t
                  ? "border-passyn-green text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "stock" ? "Search stock" : t === "url" ? "Paste URL" : "Upload"}
            </button>
          ))}
        </div>

        <div className="pt-4 space-y-3 min-h-[280px]">
          {tab === "upload" && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                JPG / PNG / WEBP / HEIC, 10 MB max
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Choose file"}
              </Button>
            </div>
          )}

          {tab === "url" && (
            <div className="space-y-3">
              <Input
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              <div className="flex gap-2 justify-end">
                {current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    Remove image
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (!pasteUrl.trim()) return;
                    onChange({ url: pasteUrl.trim(), source: "manual-url" });
                    setOpen(false);
                  }}
                >
                  Use this URL
                </Button>
              </div>
            </div>
          )}

          {tab === "stock" && (
            <div className="space-y-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (query.trim()) runSearch(query.trim());
                }}
              >
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. beachfront resort Bali"
                />
                <Button type="submit" disabled={searching}>
                  {searching ? "Searching…" : "Search"}
                </Button>
              </form>
              <div className="max-h-[400px] overflow-y-auto -mx-1 px-1">
                <Section
                  label="Pexels"
                  results={results.pexels}
                  onPick={(hit) => {
                    onChange({ url: hit.url, source: "pexels" });
                    setOpen(false);
                  }}
                />
                <Section
                  label="Unsplash"
                  results={results.unsplash}
                  onPick={(hit) => {
                    onChange({ url: hit.url, source: "unsplash" });
                    setOpen(false);
                  }}
                />
                {!searching &&
                  results.pexels.length === 0 &&
                  results.unsplash.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No results yet. Try a search.
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  label,
  results,
  onPick,
}: {
  label: string;
  results: StockHit[];
  onPick: (h: StockHit) => void;
}) {
  if (!results.length) return null;
  return (
    <div className="mb-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {results.map((r, i) => (
          <button
            key={`${label}-${i}`}
            onClick={() => onPick(r)}
            className="relative aspect-video bg-muted rounded overflow-hidden hover:ring-2 hover:ring-passyn-green focus:outline-none focus:ring-2 focus:ring-passyn-green"
            type="button"
            title={r.alt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.thumb ?? r.url}
              alt={r.alt ?? ""}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
