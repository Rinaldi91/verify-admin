import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === '/login';

  // Ambil permissions dari cookie
  const rawPermissions = request.cookies.get('permissions')?.value || '[]';
  let permissions: string[] = [];

  try {
    permissions = JSON.parse(rawPermissions);
  } catch (e) {
    permissions = [];
  }

  // Halaman yang perlu login
  const protectedPaths = ['/dashboard', '/admin', '/roles', '/users'];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  // 1. Belum login → redirect login
  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Sudah login, ke /login → redirect ke dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Cek permission berdasarkan halaman
  const permissionMap: Record<string, string> = {
    '/users': 'view-users',
    '/roles': 'view-roles',
    '/admin': 'access-admin-panel',
  };

  for (const [routePrefix, requiredPermission] of Object.entries(permissionMap)) {
    if (pathname.startsWith(routePrefix) && !permissions.includes(requiredPermission)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
