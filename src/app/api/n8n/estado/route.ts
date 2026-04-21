import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

function limparTel(t: string) {
  return t.replace(/\D/g, '');
}

export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const { searchParams } = req.nextUrl;
  const telefone = searchParams.get('telefone');
  const tenantId = searchParams.get('tenantId');

  if (!telefone || !tenantId) return n8nError('telefone e tenantId obrigatórios', 'MISSING_PARAM');

  const tel = limparTel(telefone);
  const estado = await prisma.conversaEstado.findUnique({
    where: { telefone_tenantId: { telefone: tel, tenantId } },
  });

  return n8nSuccess({
    estado: estado?.etapa ?? null,
    dados: estado?.dados ?? {},
    updatedAt: estado?.updatedAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { telefone?: string; tenantId?: string; etapa?: string; dados?: unknown; mensagem?: string };
  try { body = await req.json(); } catch { return n8nError('JSON inválido', 'INVALID_BODY'); }

  const { telefone, tenantId, etapa, dados, mensagem } = body;
  if (!telefone || !tenantId || !etapa) return n8nError('telefone, tenantId e etapa obrigatórios', 'MISSING_PARAM');

  const tel = limparTel(telefone);
  const estado = await prisma.conversaEstado.upsert({
    where: { telefone_tenantId: { telefone: tel, tenantId } },
    update: { etapa, dados: dados as any ?? {} },
    create: { telefone: tel, tenantId, etapa, dados: dados as any ?? {} },
  });

  return n8nSuccess({ ok: true, etapa: estado.etapa, mensagem });
}

export async function DELETE(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const { searchParams } = req.nextUrl;
  const telefone = searchParams.get('telefone');
  const tenantId = searchParams.get('tenantId');
  const mensagem = searchParams.get('mensagem');

  if (!telefone || !tenantId) return n8nError('telefone e tenantId obrigatórios', 'MISSING_PARAM');

  const tel = limparTel(telefone);
  await prisma.conversaEstado.deleteMany({ where: { telefone: tel, tenantId } });

  return n8nSuccess({ ok: true, mensagem });
}
