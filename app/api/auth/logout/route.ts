import { NextRequest, NextResponse } from "next/server";
import { invalidateUserSession } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Get token from cookie
    const token = req.cookies.get("auth-token")?.value;
    
    if (token) {
      // Invalidate session in database
      await invalidateUserSession(token);
    }

    const response = NextResponse.json({ 
      success: true,
      message: "Logged out successfully"
    });
    
    // Clear the auth cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Logout error:", error);
    // Still clear cookie even if database operation fails
    const response = NextResponse.json({ 
      success: true,
      message: "Logged out successfully"
    });
    
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  }
}