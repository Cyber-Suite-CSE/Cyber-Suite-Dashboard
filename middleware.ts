import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Public paths that don't require authentication
  const isPublic = 
    pathname === "/login" ||
    pathname.startsWith("/login/") || // Handle trailing slash explicitly
    pathname === "/metrics" ||
    pathname === "/metrics/" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"

  console.log(`[Middleware Debug] pathname: ${pathname}, isPublic: ${isPublic}`);

  // Skip middleware for public paths
  if (isPublic) {
    return NextResponse.next()
  }

  const token = req.cookies.get("auth_token")?.value

  // Redirect to login if no token
  // Note: Strict validation happens at the API Gateway
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
