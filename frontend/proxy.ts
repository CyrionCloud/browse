import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TEMPORARILY DISABLED - Route protection was blocking signin redirect
// Re-enable after confirming auth flow works
export function proxy(request: NextRequest) {
    // Just pass through all requests for now
    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
