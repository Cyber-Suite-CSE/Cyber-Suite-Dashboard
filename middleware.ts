import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "default-secret"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Public paths that don't require authentication
  const isPublic = 
    pathname === "/login" ||
    pathname.startsWith("/login/") || // Handle trailing slash explicitly
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"

  // Skip middleware for public paths
  if (isPublic) {
    return NextResponse.next()
  }

  const token = req.cookies.get("auth_token")?.value

  // Redirect to login if no token
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch (err) {
    // Redirect to login if invalid token
    return NextResponse.redirect(new URL("/login", req.url))
  }
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
