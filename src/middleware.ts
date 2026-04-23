import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Rotas de API que NÃO precisam de token — passam direto
const API_PUBLICAS = [
  '/api/auth/',
  '/api/billing/webhook',
  '/api/subscriptions/webhook',
  '/api/bot/',
  '/api/n8n/',
  '/api/cron/',
  '/api/public/',
  '/api/convite/',
  '/api/health',
  '/api/webhook/',
  '/api/debug/',
  // NOTA: /api/admin/ foi removido intencionalmente — protegido pelo middleware JWT
  // Os endpoints admin validam adicionalmente o x-admin-secret internamente
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas de admin: validadas pelo x-admin-secret (não usam JWT)
  if (pathname.startsWith('/api/admin/')) {
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret =
      request.headers.get('x-admin-secret') ??
      request.nextUrl.searchParams.get('secret') ?? '';
    if (!adminSecret || providedSecret !== adminSecret) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Deixar passar rotas públicas sem validar token
  if (API_PUBLICAS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Sessão expirada ou inválida' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        error: 'Acesso negado: Token inválido ou segredo divergente',
        debug: { hasToken: !!token, tokenLength: token?.length },
      }, { status: 403 });
    }

    if (!payload.tenantId) {
      return NextResponse.json({
        error: 'Acesso negado: Tenant não identificado no payload',
        debug: { payload },
      }, { status: 403 });
    }

    // Autorização para rotas de admin Synka
    if (pathname.startsWith('/api/admin') && payload.role !== 'synka_admin') {
      return NextResponse.json({
        error: 'Acesso restrito: Apenas administradores Synka',
        role: payload.role,
      }, { status: 403 });
    }

    // Injetar contexto do tenant nos headers para as route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    if (payload.profissionalId) {
      requestHeaders.set('x-profissional-id', payload.profissionalId);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    console.error('Middleware Error:', error);
    return NextResponse.json({ error: 'Erro interno no Middleware' }, { status: 500 });
  }
}

// Matcher genérico: intercepta TODAS as rotas /api/* automaticamente.
// Qualquer nova rota criada já estará protegida sem precisar editar este arquivo.
export const config = {
  matcher: ['/api/:path*'],
};
