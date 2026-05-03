import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-secondary/40">
      <AppHeader user={user} />
      <main className="container py-8">{children}</main>
    </div>
  );
}
