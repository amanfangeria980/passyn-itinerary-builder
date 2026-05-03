import Link from "next/link";
import { Composer } from "./composer";

export const dynamic = "force-dynamic";

export default function NewItineraryPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to itineraries
          </Link>
          <h1 className="font-display text-3xl font-semibold mt-1">
            New itinerary
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste raw trip details, attach tickets and photos, hit{" "}
            <span className="font-medium">Generate itinerary</span> — the
            NVIDIA NIM parser turns it into a day-wise document you can edit.
          </p>
        </div>
      </div>

      <Composer />
    </div>
  );
}
