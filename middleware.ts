import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow access page and demo page to bypass auth check
  if (path === '/access' || path === '/' || path === '/demo') {
    return NextResponse.next();
  }

  // Check for demo access in production
  if (process.env.NODE_ENV === 'production') {
    // In browser, this will be checked client-side
    // For server-side pages, we'll redirect
    const hasAccess = request.cookies.get('demo_access')?.value === 'granted';

    if (!hasAccess && !path.startsWith('/access')) {
      return NextResponse.redirect(new URL('/access', request.url));
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
