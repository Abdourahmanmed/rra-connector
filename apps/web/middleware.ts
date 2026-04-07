import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getAuthCookieName } from "@/lib/auth"

const PUBLIC_AUTH_ROUTES = ["/login", "/register"]
const PROTECTED_PREFIX = "/dashboard"

export function middleware(request: NextRequest) {
  const token = request.cookies.get(getAuthCookieName())?.value
  const { pathname } = request.nextUrl

  if (pathname.startsWith(PROTECTED_PREFIX) && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (PUBLIC_AUTH_ROUTES.includes(pathname) && token) {
    return NextResponse.redirect(new URL(PROTECTED_PREFIX, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*"],
}
