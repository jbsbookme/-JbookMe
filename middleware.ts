import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdmin, isBarberOrStylist, isClient } from '@/lib/auth/role-utils';

function redirectToAuth(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/auth';
  url.searchParams.set('callbackUrl', `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Legacy route namespace: keep old links/bookmarks working.
  if (pathname === '/dashboard/barber' || pathname.startsWith('/dashboard/barber/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace('/dashboard/barber', '/dashboard/barbero');
    return NextResponse.redirect(url);
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;

  // Treat /inicio as a public landing page. If the user is already authenticated,
  // redirect them to their role-specific home.
  if (pathname === '/inicio' && token) {
    const url = req.nextUrl.clone();

    if (isAdmin(role)) {
      url.pathname = '/dashboard/admin';
      return NextResponse.redirect(url);
    }

    if (isBarberOrStylist(role)) {
      url.pathname = '/dashboard/barbero';
      return NextResponse.redirect(url);
    }

    if (isClient(role)) {
      url.pathname = '/feed';
      return NextResponse.redirect(url);
    }

    // Unknown role: take them to a safe default.
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Keep backward-compat: the client "My Profile" entry historically pointed to
  // /dashboard/cliente, but the redesigned profile lives at /perfil.
  if (pathname === '/dashboard/cliente' && token && isClient(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/perfil';
    return NextResponse.redirect(url);
  }

  const isAppProtectedRoute =
    pathname === '/feed' ||
    pathname.startsWith('/feed/') ||
    pathname === '/reservar' ||
    pathname.startsWith('/reservar/') ||
    pathname === '/inbox' ||
    pathname.startsWith('/inbox/') ||
    pathname === '/notificaciones' ||
    pathname.startsWith('/notificaciones/') ||
    pathname === '/perfil' ||
    pathname.startsWith('/perfil/') ||
    pathname === '/menu' ||
    pathname.startsWith('/menu/');

  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isDashboardAdmin = pathname.startsWith('/dashboard/admin');
  const isDashboardBarber = pathname.startsWith('/dashboard/barbero');
  const isDashboardClient = pathname.startsWith('/dashboard/cliente');

  const isApiAdmin = pathname.startsWith('/api/admin');
  const isApiBarber = pathname.startsWith('/api/barber');

  const needsAuth =
    isAppProtectedRoute ||
    isDashboard ||
    isDashboardAdmin ||
    isDashboardBarber ||
    isDashboardClient ||
    isApiAdmin ||
    isApiBarber;
  if (!needsAuth) return NextResponse.next();

  if (!token) {
    // APIs should return 401 instead of redirect.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return redirectToAuth(req);
  }

  if (isDashboardAdmin || isApiAdmin) {
    if (!isAdmin(role)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  if (isDashboardBarber || isApiBarber) {
    if (!isBarberOrStylist(role) && !isAdmin(role)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  if (isDashboardClient) {
    if (!isClient(role) && !isAdmin(role)) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/inicio',
    '/feed/:path*',
    '/reservar/:path*',
    '/inbox/:path*',
    '/notificaciones/:path*',
    '/perfil/:path*',
    '/menu/:path*',
    '/dashboard/:path*',
    '/dashboard/admin/:path*',
    '/dashboard/barbero/:path*',
    '/dashboard/barber/:path*',
    '/dashboard/cliente/:path*',
    '/api/admin/:path*',
    '/api/barber/:path*',
  ],
};
