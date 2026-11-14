import { prisma } from "@/lib/prisma";

// Since Nov 2026 auth.ts's jwt callback ends a session on every request
// whose user row is gone, so a deleted account's token no longer reaches a
// route at all. This stays as a second check right before a quota-consuming
// route trusts session.user.id as a live foreign key: without it, an account
// deleted between the session check and the write would crash on a
// foreign-key violation instead of returning a clean response.
export async function userStillExists(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  return user !== null;
}
