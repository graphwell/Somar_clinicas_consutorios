import { NextRequest } from 'next/server';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/n8n/fila-espera/sair
 * Ferramenta: tool_fila_sair
 * Body: { tenantId, telefone }
 */
export async function PATCH(req: NextRequest) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  let body: any;
  try { body = await req.json(); } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { tenantId, telefone } = body;
  if (!tenantId || !telefone) {
    return n8nError('tenantId e telefone são obrigatórios', 'MISSING_PARAM');
  }

  try {
    const resp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/fila-espera/sair`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.N8N_API_KEY ?? '' },
      body: JSON.stringify({ tenantId, telefone }),
    });

    const data = await resp.json();
    return Response.json(data);
  } catch (err) {
    console.error('[n8n/fila-espera/sair]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
