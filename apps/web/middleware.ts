import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getAuthCookieName } from "@/lib/auth"

const PUBLIC_AUTH_ROUTES = ["/login", "/register"]
const PROTECTED_PREFIXES = ["/dashboard", "/invoices", "/settings", "/logs"]

export function middleware(request: NextRequest) {
  const token = request.cookies.get(getAuthCookieName())?.value
  const { pathname } = request.nextUrl

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (PUBLIC_AUTH_ROUTES.includes(pathname) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*", "/invoices/:path*", "/settings/:path*", "/logs/:path*"],
}
