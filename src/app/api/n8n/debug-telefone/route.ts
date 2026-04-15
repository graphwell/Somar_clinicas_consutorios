import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/telefone?tel=5511999999999&tenantId=xxx
 * Diagnóstico: mostra como o telefone é buscado no banco.
 * Protegido pela mesma API key do n8n (x-api-key).
 */
export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const { searchParams } = new URL(req.url);
  const telefone = searchParams.get('tel') ?? '';
  const tenantId = searchParams.get('tenantId') ?? undefined;

  if (!telefone) {
    return NextResponse.json({ error: 'Parâmetro ?tel= obrigatório' }, { status: 400 });
  }

  const telefoneClean = telefone.replace(/\D/g, '');
  const last8 = telefoneClean.slice(-8);

  // 1. Busca exata
  const exact = await prisma.paciente.findFirst({
    where: tenantId
      ? { tenantId, OR: [{ telefone }, { telefone: telefoneClean }] }
      : { OR: [{ telefone }, { telefone: telefoneClean }] },
    select: { id: true, nome: true, telefone: true, tenantId: true },
  });

  // 2. Busca endsWith
  const endsWith = await prisma.paciente.findFirst({
    where: tenantId
      ? { tenantId, telefone: { endsWith: last8 } }
      : { telefone: { endsWith: last8 } },
    select: { id: true, nome: true, telefone: true, tenantId: true },
  });

  // 3. Busca raw SQL (normaliza caracteres do campo)
  type Row = { id: string; nome: string; telefone: string; tenantId: string };
  const rawRows = tenantId
    ? await prisma.$queryRaw<Row[]>(
        Prisma.sql`SELECT id, nome, telefone, "tenantId" FROM paciente
                   WHERE regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${'%' + last8}
                     AND "tenantId" = ${tenantId}
                   LIMIT 5`
      )
    : await prisma.$queryRaw<Row[]>(
        Prisma.sql`SELECT id, nome, telefone, "tenantId" FROM paciente
                   WHERE regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${'%' + last8}
                   LIMIT 5`
      );

  // 4. Agendamentos pendentes (se achou algum paciente)
  const pacienteEncontrado = exact ?? endsWith ?? rawRows[0] ?? null;
  const agendamentos = pacienteEncontrado
    ? await prisma.agendamento.findMany({
        where: {
          pacienteId: pacienteEncontrado.id,
          status: 'pendente',
          dataHora: { gte: new Date() },
        },
        orderBy: { dataHora: 'asc' },
        select: { id: true, dataHora: true, status: true },
        take: 3,
      })
    : [];

  return NextResponse.json({
    input: { telefone, telefoneClean, last8, tenantId },
    buscas: {
      exact: exact ?? null,
      endsWith: endsWith ?? null,
      rawSQL: rawRows,
    },
    pacienteEncontrado,
    agendamentosPendentes: agendamentos,
  });
}
