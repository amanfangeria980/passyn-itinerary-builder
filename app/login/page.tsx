import Image from "next/image";
import { redirect } from "next/navigation";
import { BRANDING } from "@/lib/branding";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  if (user) redirect(sp.next || "/dashboard");

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col justify-between p-12 bg-passyn-green text-passyn-ink">
        <div className="flex items-center gap-3">
          <Image
            src={BRANDING.logoPath}
            alt={`${BRANDING.agencyName} logo`}
            width={48}
            height={48}
            className="rounded-md bg-white/40 p-1"
          />
          <div className="font-display text-2xl font-semibold">
            {BRANDING.agencyName}
          </div>
        </div>

        <div>
          <h1 className="font-display text-5xl leading-tight font-semibold">
            Crafted journeys,
            <br /> beautifully delivered.
          </h1>
          <p className="mt-4 text-passyn-ink/70 max-w-md">
            Internal itinerary builder for {BRANDING.agencyName}. Paste raw
            trip notes, attach tickets and photos, and ship a polished,
            client-ready document in minutes.
          </p>
        </div>

        <div className="text-sm text-passyn-ink/70">
          {BRANDING.contactName} &middot; {BRANDING.email} &middot;{" "}
          {BRANDING.phone}
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image
              src={BRANDING.logoPath}
              alt=""
              width={36}
              height={36}
              className="rounded-md"
            />
            <div className="font-display text-xl font-semibold">
              {BRANDING.agencyName}
            </div>
          </div>

          <h2 className="font-display text-3xl font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your {BRANDING.agencyName} credentials. Access is by invitation
            only — no public signup.
          </p>

          <div className="mt-8">
            <LoginForm next={sp.next} />
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Trouble signing in? Contact {BRANDING.contactName} at{" "}
            <a
              className="underline underline-offset-2"
              href={`mailto:${BRANDING.email}`}
            >
              {BRANDING.email}
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
