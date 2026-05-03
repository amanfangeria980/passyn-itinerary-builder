import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Root() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
