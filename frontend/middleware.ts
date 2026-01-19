import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/auth/login', '/auth/signup', '/']
const authRoutes = ['/auth/login', '/auth/signup']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Get session from cookie (Supabase stores it there)
    const sessionCookie = request.cookies.get('sb-pwebxxmyksequxxwfdar-auth-token')
    const hasSession = !!sessionCookie

    // If user is on auth page and has session, redirect to dashboard
    if (authRoutes.includes(pathname) && hasSession) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If user is trying to access protected route and has no session, redirect to login
    if (!publicRoutes.includes(pathname) && !pathname.startsWith('/auth') && !hasSession) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
