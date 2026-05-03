"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ItineraryToolbar({
  itineraryId,
  hasContent,
  shareToken,
}: {
  itineraryId: string;
  hasContent: boolean;
  shareToken: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(
    shareToken
      ? typeof window !== "undefined"
        ? `${window.location.origin}/share/${shareToken}`
        : `/share/${shareToken}`
      : null,
  );

  async function reparse() {
    setBusy("Re-parsing…");
    const tid = toast.loading("Reading your itinerary…");
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}/parse`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(`Parse failed: ${j.error || res.status}`, { id: tid });
      } else {
        toast.success("Itinerary updated", { id: tid });
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function makeShareLink() {
    setBusy("Creating link…");
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}/share`, {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(`Share failed: ${j.error || res.status}`);
        return;
      }
      const url = `${window.location.origin}/share/${j.token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      setShareUrl(url);
      toast.success("Share link copied to clipboard");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={reparse}
        disabled={!!busy}
      >
        {busy ?? (hasContent ? "Re-parse" : "Generate / Re-parse")}
      </Button>
      {hasContent && (
        <Link href={`/itinerary/${itineraryId}/edit`}>
          <Button size="sm">Edit</Button>
        </Link>
      )}
      {hasContent && (
        <a
          href={`/api/itinerary/${itineraryId}/export/pdf`}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline" size="sm">
            PDF
          </Button>
        </a>
      )}
      {hasContent && (
        <a
          href={`/api/itinerary/${itineraryId}/export/docx`}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline" size="sm">
            DOCX
          </Button>
        </a>
      )}
      {hasContent && (
        <Button variant="outline" size="sm" onClick={makeShareLink}>
          {shareUrl ? "Copy link" : "Share link"}
        </Button>
      )}
      {shareUrl && (
        <span className="text-xs text-muted-foreground self-center">
          {shareUrl.replace(/^https?:\/\//, "")}
        </span>
      )}
    </div>
  );
}
