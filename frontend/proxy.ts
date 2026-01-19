import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/auth/login', '/auth/signup', '/', '/login', '/signup']
const authRoutes = ['/auth/login', '/auth/signup', '/login', '/signup']

// Export as proxy function for Next.js 16
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Get all cookies and check for any Supabase auth cookie
    const cookies = request.cookies.getAll()
    const hasSession = cookies.some(cookie =>
        cookie.name.includes('sb-') &&
        (cookie.name.includes('-auth-token') || cookie.name.includes('access_token') || cookie.name.includes('refresh_token'))
    )

    // If user is on auth page and has session, redirect to dashboard
    if (authRoutes.includes(pathname) && hasSession) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If user is trying to access protected route and has no session, redirect to login
    // But allow the redirect to happen - don't block immediately after login
    if (!publicRoutes.includes(pathname) && !pathname.startsWith('/auth') && !pathname.startsWith('/dashboard') && !hasSession) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

