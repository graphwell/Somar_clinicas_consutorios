import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
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
    '/api/admin',
    '/api/tenant',
    '/api/appointments',
    '/api/team',
    '/api/patients',
    '/api/bot',
    '/api/convenios'
  ];

  if (protectedPrefixes.some(prefix => pathname.startsWith(prefix))) {
    try {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.split(' ')[1];

      if (!token) {
        // Rotas de bot podem não ter token (usam query params ou apiKey)
        if (pathname.startsWith('/api/bot')) {
          return NextResponse.next();
        }
        return NextResponse.json({ error: 'Sessão expirada ou inválida' }, { status: 401 });
      }

      const payload = await verifyToken(token);
      if (!payload) {
        return NextResponse.json({ 
          error: 'Acesso negado: Token inválido ou segredo divergente',
          debug: { hasToken: !!token, tokenLength: token?.length }
        }, { status: 403 });
      }

      if (!payload.tenantId) {
        return NextResponse.json({ 
          error: 'Acesso negado: Tenant não identificado no payload',
          debug: { payload } 
        }, { status: 403 });
      }

      // Autorização para Admin Synka
      if (pathname.startsWith('/api/admin') && payload.role !== 'synka_admin') {
        return NextResponse.json({ 
          error: 'Acesso restrito: Apenas administradores Synka',
          role: payload.role 
        }, { status: 403 });
      }

      // Injetamos o tenantId verificado no header da REQUISIÇÃO para que as rotas de API recebam
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-tenant-id', payload.tenantId);
      requestHeaders.set('x-user-id', payload.userId);
      requestHeaders.set('x-user-role', payload.role);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error('Middleware Error:', error);
      return NextResponse.json({ error: 'Erro interno no Middleware' }, { status: 500 });
    }
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
    '/api/billing/:path*',
    '/api/tenant/:path*',
    '/api/appointments/:path*',
    '/api/team/:path*',
    '/api/patients/:path*',
    '/api/convenios/:path*',
    '/api/bot/:path*'
  ],
};
