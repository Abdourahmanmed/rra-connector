import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getAuthCookieName } from "@/lib/auth"

const PUBLIC_AUTH_ROUTE = "/login"
const PROTECTED_PREFIX = "/dashboard"

export function middleware(request: NextRequest) {
  const token = request.cookies.get(getAuthCookieName())?.value
  const { pathname } = request.nextUrl

  if (pathname.startsWith(PROTECTED_PREFIX) && !token) {
    return NextResponse.redirect(new URL(PUBLIC_AUTH_ROUTE, request.url))
  }

  if (pathname === PUBLIC_AUTH_ROUTE && token) {
    return NextResponse.redirect(new URL(PROTECTED_PREFIX, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
}
