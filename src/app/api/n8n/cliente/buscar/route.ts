import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/n8n/cliente/buscar
 * Query: ?telefone=85999990000 & (slug=xxx OU tenantId=xxx)
 * Busca cliente por telefone. Retorna { encontrado, cliente }.
 */
export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const telefone = req.nextUrl.searchParams.get('telefone');
  const slug = req.nextUrl.searchParams.get('slug');
  const tenantId = req.nextUrl.searchParams.get('tenantId');

  if (!telefone) return n8nError('Parâmetro telefone obrigatório', 'MISSING_PARAM');
  if (!slug && !tenantId) return n8nError('Informe slug ou tenantId', 'MISSING_PARAM');

  try {
    let tid = tenantId;
    if (!tid && slug) {
      const clinica = await prisma.clinica.findUnique({
        where: { slug },
        select: { tenantId: true },
      });
      if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);
      tid = clinica.tenantId;
    }

    const clean = telefone.replace(/\D/g, '');

    const paciente = await prisma.paciente.findFirst({
      where: {
        tenantId: tid!,
        OR: [
          { telefone: clean },
          { telefone: telefone },
          { telefone: { endsWith: clean.slice(-8) } },
        ],
      },
      include: {
        assinaturas: {
          where: { status: 'ativo' },
          select: { plano: true, servicosRestantes: true },
          take: 1,
        },
        agendamentos: {
          where: { status: { not: 'cancelado' } },
          orderBy: { dataHora: 'desc' },
          take: 5,
          select: {
            id: true,
            dataHora: true,
            status: true,
            servico: { select: { nome: true } },
          },
        },
      },
    });

    if (!paciente) {
      return n8nSuccess({
        encontrado: false,
        cliente: null,
        saudacaoBot: 'Cliente não encontrado. Vou criar um novo cadastro.',
        msgBot: 'Cliente não encontrado. Vou criar um novo cadastro.',
      });
    }

    const now = new Date();
    const proximos = paciente.agendamentos.filter(a => a.dataHora > now);
    const anteriores = paciente.agendamentos.filter(a => a.dataHora <= now);

    const planoAtivo = paciente.assinaturas[0]
      ? {
          nome: paciente.assinaturas[0].plano ?? null,
          servicosRestantes: paciente.assinaturas[0].servicosRestantes ?? null,
        }
      : null;

    const proximoAgendamento = proximos[0]
      ? {
          id: proximos[0].id,
          data: proximos[0].dataHora.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' }),
          horario: proximos[0].dataHora.toLocaleTimeString('en-GB', {
            timeZone: 'America/Fortaleza',
            hour: '2-digit',
            minute: '2-digit',
          }),
          servico: proximos[0].servico?.nome ?? null,
        }
      : null;

    const ultimaVisita = anteriores[0]
      ? anteriores[0].dataHora.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' })
      : null;

    const primeiroNome = paciente.nome.split(' ')[0];
    const saudacaoBot = proximoAgendamento
      ? `Olá, ${primeiroNome}! Você tem um agendamento em ${proximoAgendamento.data} às ${proximoAgendamento.horario}.`
      : `Olá, ${primeiroNome}! Como posso ajudar?`;

    return n8nSuccess({
      encontrado: true,
      saudacaoBot,
      msgBot: saudacaoBot,
      cliente: {
        id: paciente.id,
        nome: paciente.nome,
        telefone: paciente.telefone,
        totalVisitas: anteriores.length,
        ultimaVisita,
        planoAtivo,
        proximoAgendamento,
      },
    });
  } catch (err) {
    console.error('[n8n/cliente/buscar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
