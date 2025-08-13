import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAdminSessionFromRequest } from "@/lib/auth"

export function middleware(request: NextRequest) {
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Skip middleware for admin login page and login API
    if (request.nextUrl.pathname === "/admin/login" || 
        request.nextUrl.pathname === "/api/admin/login") {
      return NextResponse.next()
    }
    
    const adminSession = getAdminSessionFromRequest(request)
    
    if (!adminSession || !adminSession.isAdmin) {
      // Redirect to login for page routes
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
  }

  // Protect admin API routes (except login/logout)
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    // Skip authentication for login and logout endpoints
    if (request.nextUrl.pathname === "/api/admin/login" ||
        request.nextUrl.pathname === "/api/admin/logout") {
      return NextResponse.next()
    }
    
    const adminSession = getAdminSessionFromRequest(request)
    
    if (!adminSession || !adminSession.isAdmin) {
      // Return 401 for API routes
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized - Invalid or expired session" 
      }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
