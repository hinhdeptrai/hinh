import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { verifyUserSession } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

export async function GET(req: NextRequest) {
  try {
    console.log('Auth status check requested');
    
    // Get token from cookie
    const token = req.cookies.get("auth-token")?.value;
    console.log('Token present in status check:', !!token);

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: "No token found" },
        { status: 401 }
      );
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    console.log('JWT token verified in status check');
    
    // Additionally verify session in database
    const session = await verifyUserSession(token);
    console.log('Database session verification in status check:', !!session);
    
    if (!session) {
      // Session not found or expired, but we should clean up the invalid cookie
      const response = NextResponse.json(
        { authenticated: false, error: "Session not found or expired" },
        { status: 401 }
      );
      response.cookies.delete("auth-token");
      return response;
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      sessionId: session.id,
      expiresAt: session.expires_at,
      payload: payload 
    });
  } catch (error) {
    console.error("Auth status error:", error);
    const response = NextResponse.json(
      { authenticated: false, error: "Invalid token" },
      { status: 401 }
    );
    response.cookies.delete("auth-token");
    return response;
  }
}