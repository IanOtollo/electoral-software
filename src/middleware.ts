import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  
  // 1. Exclude public paths that shouldn't require basic auth
  // - /upload: field agents need to access this without a global password
  // - /api: any webhooks
  // - /_next: static assets
  if (
    url.pathname.startsWith('/upload') || 
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/_next') ||
    url.pathname.includes('.') // Exclude files like images, icons
  ) {
    return NextResponse.next()
  }

  // 2. Global Basic Authentication for the rest of the site
  const basicAuth = req.headers.get('authorization')
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const decoded = atob(authValue)
    const [user, pwd] = decoded.split(':')

    // Simple hardcoded secure access
    if (user === 'admin' && pwd === 'secure2027') {
      return NextResponse.next()
    }
  }

  // 3. Prompt for Basic Auth if not provided or incorrect
  return new NextResponse('Authentication required. This is a secure system.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Campaign Management System"',
    },
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
