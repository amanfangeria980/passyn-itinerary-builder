import Link from "next/link";
import { BRANDING } from "@/lib/branding";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center bg-secondary/40">
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="font-display text-3xl font-semibold">
          We couldn’t find that page
        </h1>
        <p className="text-sm text-muted-foreground">
          You can head back to your {BRANDING.agencyName} dashboard.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-2 px-4 py-2 rounded-md bg-passyn-green text-passyn-ink font-medium"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
