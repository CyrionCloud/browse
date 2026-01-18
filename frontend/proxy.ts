import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isAuthRoute = pathname === '/login' ||
                       pathname === '/signup' ||
                       pathname === '/forgot-password' ||
                       pathname === '/reset-password'

  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(cookie =>
    cookie.name.includes('-auth-token') ||
    cookie.name.includes('supabase-auth-token')
  )

  if (isDashboardRoute && !hasAuthCookie) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && hasAuthCookie) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
  ],
}
