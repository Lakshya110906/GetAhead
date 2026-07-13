import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

  try {
    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: "ADMIN_LOGOUT",
        details: `Admin logout from IP ${ip}`,
        ip,
        status: "SUCCESS",
      },
    });
  } catch {}

  const response = NextResponse.json({ success: true });
  response.cookies.delete("exameval_admin_token");
  return response;
}
