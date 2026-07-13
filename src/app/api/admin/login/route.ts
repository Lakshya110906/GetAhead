import { NextRequest, NextResponse } from "next/server";
import { handleRateLimit, recordLoginAttempt, encryptToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
  
  // 1. Check Rate Limit
  const limitCheck = handleRateLimit(ip);
  if (!limitCheck.success) {
    return NextResponse.json({ error: limitCheck.error }, { status: 429 });
  }

  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "adminpassword123";

    if (password !== adminPassword) {
      recordLoginAttempt(ip, false);
      
      // Delay response on failure to mitigate brute force timing attacks
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Write error log to Database
      await prisma.errorLog.create({
        data: {
          type: "AUTHENTICATION",
          message: `Failed admin login attempt from IP ${ip}`,
          path: "/api/admin/login",
        },
      });

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Success! Record attempt
    recordLoginAttempt(ip, true);

    // Create session (expires in 2 hours)
    const expires = Date.now() + 2 * 60 * 60 * 1000;
    const token = encryptToken({ isAdmin: true, expires });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: "ADMIN_LOGIN",
        details: `Successful admin login from IP ${ip}`,
        ip,
        status: "SUCCESS",
      },
    });

    const response = NextResponse.json({ success: true });
    
    // Set secure HTTP-only cookie
    response.cookies.set("exameval_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 2 * 60 * 60, // 2 hours
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Login endpoint error:", err);
    return NextResponse.json({ error: `Invalid request payload: ${msg}` }, { status: 400 });
  }
}
