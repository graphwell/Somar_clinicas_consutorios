import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/n8n/agenda/confirmar
 * Body: { telefone, tenantId }
 *
 * Chamado pelo n8n quando o cliente responde SIM no WhatsApp.
 * Confirma o próximo agendamento pendente do cliente.
 */
export async function PATCH(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { telefone?: string; tenantId?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { telefone, tenantId } = body;
  if (!telefone)  return n8nError('telefone é obrigatório', 'MISSING_PARAM');

  try {
    const telefoneClean = telefone.replace(/\D/g, '');
    const last8 = telefoneClean.slice(-8);

    // Busca paciente pelo telefone — primeiro no tenant informado,
    // depois em qualquer tenant (instância UltraMsg compartilhada).
    // endsWith só funciona para telefones sem formatação. Para cobrir
    // pacientes cadastrados com formatação (ex: "(11) 98765-4321"),
    // usamos raw SQL como fallback que normaliza o campo no banco.
    const wherePhone = {
      OR: [
        { telefone },
        { telefone: telefoneClean },
        { telefone: { endsWith: last8 } },
      ],
    };

    let paciente = await prisma.paciente.findFirst({
      where: tenantId ? { tenantId, ...wherePhone } : wherePhone,
      select: { id: true, nome: true, tenantId: true },
    }) ?? await prisma.paciente.findFirst({
      where: wherePhone,
      select: { id: true, nome: true, tenantId: true },
    });

    // Fallback: busca normalizando o telefone armazenado (remove não-dígitos)
    // Cobre pacientes cadastrados com formatação, ex: "(11) 98765-4321"
    if (!paciente) {
      type PacienteRow = { id: string; nome: string; tenantId: string };
      const rows = tenantId
        ? await prisma.$queryRaw<PacienteRow[]>(
            Prisma.sql`SELECT id, nome, "tenantId" FROM paciente
                       WHERE regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${'%' + last8}
                         AND "tenantId" = ${tenantId}
                       LIMIT 1`
          )
        : await prisma.$queryRaw<PacienteRow[]>(
            Prisma.sql`SELECT id, nome, "tenantId" FROM paciente
                       WHERE regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${'%' + last8}
                       LIMIT 1`
          );
      paciente = rows[0] ?? null;
    }

    if (!paciente) {
      return n8nError('Cliente não encontrado', 'NOT_FOUND', 404);
    }

    // Usar o tenant real do paciente para buscar o agendamento
    const tenantReal = paciente.tenantId;

    const agendamento = await prisma.agendamento.findFirst({
      where: {
        pacienteId: paciente.id,
        tenantId: tenantReal,
        status:  'pendente',
        dataHora: { gte: new Date() },
      },
      orderBy: { dataHora: 'asc' },
      include: {
        servico:      { select: { nome: true } },
        profissional: { select: { nome: true } },
      },
    });

    if (!agendamento) {
      return n8nSuccess({
        confirmado: false,
        msgBot: 'Nao encontrei agendamento pendente para confirmar. Se precisar agendar, e so me avisar!',
      });
    }

    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: {
        status:      'confirmado',
        confirmedAt: new Date(),
        confirmedBy: 'whatsapp',
      },
    });

    const hora = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(agendamento.dataHora);
    const data = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza', weekday: 'long', day: '2-digit', month: '2-digit',
    }).format(agendamento.dataHora);

    return n8nSuccess({
      confirmado:    true,
      agendamentoId: agendamento.id,
      msgBot:
        `Confirmado! Te esperamos:\n\n` +
        `Servico: ${agendamento.servico?.nome ?? 'Consulta'}\n` +
        `Data: ${data} as ${hora}\n` +
        (agendamento.profissional ? `Profissional: ${agendamento.profissional.nome}\n` : '') +
        `\nAte la!`,
    });
  } catch (err) {
    console.error('[n8n/agenda/confirmar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
