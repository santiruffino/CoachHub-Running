import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Debug log forauth-related paths or root
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth related paths
     * - forgot-password (public password reset request page)
     * - reset-password (public password reset form page)
     */
    '/((?!_next/static|_next/image|favicon.ico|reset-password|forgot-password|auth|api/auth|accept-invitation|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
