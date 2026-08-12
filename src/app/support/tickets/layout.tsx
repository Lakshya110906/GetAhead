import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Every other authenticated section (dashboard, settings, saved-reports)
// gates access here, server-side, before the client component ever mounts
// — this route was missing that layout, so a signed-out visitor hit the
// page's own client-side fetches, which 401'd, rendering a misleading
// empty ticket list instead of being redirected to /login like everywhere
// else in the app.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <>{children}</>;
}
