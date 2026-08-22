import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodErrorResponse } from "@/lib/zodError";
import { reportApiError } from "@/lib/apiError";

const preferencesSchema = z.object({
  evaluationCompletion: z.boolean(),
  featureUpdates: z.boolean(),
  weeklyProgress: z.boolean(),
  pushNotifications: z.boolean(),
});

const DEFAULT_PREFERENCES = {
  evaluationCompletion: true,
  featureUpdates: true,
  weeklyProgress: false,
  pushNotifications: true,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let preferences = DEFAULT_PREFERENCES;
    if (user.notificationPreferences) {
      try {
        preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(user.notificationPreferences) };
      } catch {
        // Malformed stored value — fall back to defaults rather than erroring the page.
      }
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    return reportApiError({ code: "PREFERENCES_FETCH_FAILED", error, route: "GET /api/user/notification-preferences" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);

    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { notificationPreferences: JSON.stringify(parsed.data) },
    });

    return NextResponse.json({ success: true, preferences: parsed.data });
  } catch (error) {
    return reportApiError({ code: "PREFERENCES_UPDATE_FAILED", error, route: "PUT /api/user/notification-preferences" });
  }
}
