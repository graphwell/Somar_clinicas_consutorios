import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/n8n/cliente/criar
 * Body: { slug, nome, telefone, email? }
 * Cria ou retorna cliente existente (upsert por telefone).
 */
export async function POST(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { slug?: string; nome?: string; telefone?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  if (!body.slug || !body.nome || !body.telefone) {
    return n8nError('slug, nome e telefone são obrigatórios', 'MISSING_PARAM');
  }

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug: body.slug },
      select: { tenantId: true },
    });
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const clean = body.telefone.replace(/\D/g, '');

    // Verifica se já existe
    const existente = await prisma.paciente.findFirst({
      where: {
        tenantId: clinica.tenantId,
        OR: [{ telefone: clean }, { telefone: body.telefone }],
      },
      select: { id: true, nome: true, telefone: true },
    });

    if (existente) {
      return n8nSuccess({ criado: false, cliente: existente });
    }

    const novo = await prisma.paciente.create({
      data: {
        nome: body.nome.trim(),
        telefone: body.telefone.trim(),
        email: body.email?.trim() ?? null,
        tipoAtendimento: 'particular',
        tenantId: clinica.tenantId,
      },
      select: { id: true, nome: true, telefone: true },
    });

    return n8nSuccess({ criado: true, cliente: novo }, null);
  } catch (err) {
    console.error('[n8n/cliente/criar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
