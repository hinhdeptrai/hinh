import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyAuthCode, storeUserSession } from "@/lib/db";
import { headers } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Valid 6-digit code is required" },
        { status: 400 }
      );
    }

    // Verify code from database
    const authCode = await verifyAuthCode(code);
    
    if (!authCode) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    // Get client info
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const userIp = forwardedFor?.split(',')[0] || realIp || req.ip || 'unknown';

    // Create JWT token
    const token = await new SignJWT({ 
      authorized: true,
      loginTime: new Date().toISOString(),
      userIp 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .setIssuedAt()
      .sign(JWT_SECRET);

    // Store session in database
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await storeUserSession(token, sessionExpiresAt, userIp, userAgent);

    const response = NextResponse.json({ 
      success: true,
      message: "Login successful",
      expiresAt: sessionExpiresAt.toISOString()
    });
    
    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    // Debug log
    console.log('Setting auth-token cookie for session:', {
      tokenLength: token.length,
      expiresAt: sessionExpiresAt.toISOString(),
      nodeEnv: process.env.NODE_ENV,
      userIp,
      cookieConfig: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60,
        path: "/",
      }
    });

    // Also try setting a test cookie to see if cookies work at all
    response.cookies.set("test-cookie", "test-value", {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}