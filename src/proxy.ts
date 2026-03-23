import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host') || '';
  
  // Lógica de Multi-tenant via Subdomínio
  // Exemplo: clinica1.somar.ia.br
  const subdomain = host.split('.')[0];
  
  if (subdomain && subdomain !== 'www' && subdomain !== 'localhost:3000' && !host.includes('vercel.app')) {
    // Aqui poderíamos reescrever a URL para rotas dinâmicas de tenant
    // url.pathname = `/_tenant/${subdomain}${url.pathname}`;
    // return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
