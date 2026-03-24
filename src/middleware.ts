import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lista de prefixos de API que exigem proteção Multi-Tenant
  const protectedPrefixes = [
    '/api/dashboard',
    '/api/reports',
    '/api/settings',
    '/api/services',
    '/api/campaigns',
    '/api/upload',
    '/api/export',
    '/api/billing',
    '/api/admin'
  ];

  if (protectedPrefixes.some(prefix => pathname.startsWith(prefix))) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Sessão expirada ou inválida' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Acesso negado: Tenant não identificado' }, { status: 403 });
    }

    // Autorização para Admin
    if (pathname.startsWith('/api/admin') && payload.role !== 'synka_admin') {
      return NextResponse.json({ error: 'Acesso restrito: Apenas administradores Synka' }, { status: 403 });
    }

    // Injetamos o tenantId verificado no header para que as rotas de API possam confiar
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/dashboard/:path*',
    '/api/reports/:path*',
    '/api/settings/:path*',
    '/api/services/:path*',
    '/api/campaigns/:path*',
    '/api/upload/:path*',
    '/api/export/:path*',
    '/api/billing/:path*'
  ],
};
