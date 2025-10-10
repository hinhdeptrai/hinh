import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

export async function middleware(request: NextRequest) {
  // Public paths that don't require authentication
  const publicPaths = ["/login", "/api/auth", "/api/scan-and-notify", "/api/scan", "/api/migrate", "/api/verify-signals", "/api/process-signal-queue", "/api/debug-queue"];
  
  const { pathname } = request.nextUrl;
  
  // Check if it's a public path
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Verify JWT token - this is sufficient for middleware
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Don't do database verification in middleware due to Edge Runtime limitations
    // The database verification will be done in API routes instead
    
    return NextResponse.next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    // Invalid token, redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};