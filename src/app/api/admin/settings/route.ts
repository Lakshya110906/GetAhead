import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { reportApiError } from "@/lib/apiError";

const DEFAULT_SETTINGS = [
  { key: "siteName", value: "GetAhead AI" },
  { key: "logoUrl", value: "" },
  { key: "maintenanceMode", value: "false" },
  { key: "defaultTheme", value: "default" },
  { key: "maxUploadSize", value: "10" }, // 10MB
  { key: "allowedFileTypes", value: "pdf,jpeg,png" },
];

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const dbSettings = await prisma.systemSetting.findMany();
    const settingsMap = new Map(dbSettings.map((s) => [s.key, s.value]));

    const result: Record<string, string> = {};
    DEFAULT_SETTINGS.forEach((def) => {
      result[def.key] = settingsMap.get(def.key) ?? def.value;
    });

    return NextResponse.json(result);
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "GET /api/admin/settings" });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    // One upsert per key was N sequential round-trips for what's always a
    // handful of settings — batched into a single transaction instead of
    // awaiting each one in turn.
    await prisma.$transaction(
      Object.keys(body).map((key) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) },
        })
      )
    );

    await prisma.auditLog.create({
      data: { action: "SETTINGS_UPDATE", details: `Updated admin settings: ${Object.keys(body).join(", ")}`, ip },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "POST /api/admin/settings" });
  }
}
