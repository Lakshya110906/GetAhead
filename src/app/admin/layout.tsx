import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Server-side gate for the admin page shell. This is a convenience for the
// UI only — the actual enforcement that matters is requireAdmin() called
// independently at the top of every /api/admin/* route handler, since a
// layout can't protect API routes and shouldn't be relied on as the only
// check.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin");
  }

  return children;
}
