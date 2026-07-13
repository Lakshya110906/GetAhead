import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS = [
  { key: "siteName", value: "ExamEval AI" },
  { key: "logoUrl", value: "" },
  { key: "maintenanceMode", value: "false" },
  { key: "defaultTheme", value: "default" },
  { key: "maxUploadSize", value: "10" }, // 10MB
  { key: "allowedFileTypes", value: "pdf,jpeg,png" },
];

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbSettings = await prisma.systemSetting.findMany();
    const settingsMap = new Map(dbSettings.map((s) => [s.key, s.value]));

    const result: Record<string, string> = {};
    DEFAULT_SETTINGS.forEach((def) => {
      result[def.key] = settingsMap.get(def.key) ?? def.value;
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    for (const key of Object.keys(body)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(body[key]) },
        create: { key, value: String(body[key]) },
      });
    }

    await prisma.auditLog.create({
      data: { action: "SETTINGS_UPDATE", details: `Updated admin settings: ${Object.keys(body).join(", ")}`, ip },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to save settings" }, { status: 500 });
  }
}
