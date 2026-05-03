import Image from "next/image";
import Link from "next/link";
import { BRANDING } from "@/lib/branding";
import { LogoutButton } from "./logout-button";

export function AppHeader({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src={BRANDING.logoPath}
            alt={`${BRANDING.agencyName} logo`}
            width={28}
            height={28}
            className="rounded"
          />
          <span className="font-display text-lg font-semibold text-passyn-ink">
            {BRANDING.agencyName}
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
            Itinerary Builder
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
