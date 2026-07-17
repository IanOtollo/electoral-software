import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('sessionToken')?.value

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
}
