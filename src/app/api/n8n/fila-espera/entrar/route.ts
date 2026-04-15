import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/n8n/fila-espera/entrar
 * Ferramenta: tool_fila_entrar
 * Body: { tenantId, telefone, servicoId, profissionalId?, dataDesejada, horarioDesejado?, preferencia? }
 */
export async function POST(req: NextRequest) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  let body: any;
  try { body = await req.json(); } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { tenantId, telefone, servicoId, profissionalId, dataDesejada, horarioDesejado, preferencia = 'qualquer' } = body;

  if (!tenantId || !telefone || !servicoId || !dataDesejada) {
    return n8nError('tenantId, telefone, servicoId e dataDesejada são obrigatórios', 'MISSING_PARAM');
  }

  try {
    // Resolver paciente pelo telefone
    const paciente = await prisma.paciente.findFirst({
      where: { tenantId, telefone: { contains: telefone.slice(-8) } },
    });

    if (!paciente) {
      return n8nSuccess({
        entrou: false,
        motivo: 'paciente_nao_encontrado',
        msgBot: 'Nao encontrei seu cadastro. Gostaria de se cadastrar para entrar na fila?',
      });
    }

    // Delegar para a rota interna
    const resp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/fila-espera/entrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.N8N_API_KEY ?? '' },
      body: JSON.stringify({ tenantId, pacienteId: paciente.id, servicoId, profissionalId, dataDesejada, horarioDesejado, preferencia }),
    });

    const data = await resp.json();
    return Response.json(data);
  } catch (err) {
    console.error('[n8n/fila-espera/entrar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
