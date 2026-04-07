import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

function gerarProtocolo(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * POST /api/n8n/agenda/criar
 * Body: { slug, clienteNome, clienteTelefone, servicoId, profissionalId?, data, horario, origem? }
 * Cria agendamento via bot/n8n e retorna protocolo.
 */
export async function POST(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: {
    slug?: string;
    clienteNome?: string;
    clienteTelefone?: string;
    servicoId?: string;
    profissionalId?: string;
    data?: string;
    horario?: string;
    origem?: string;
  };

  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { slug, clienteNome, clienteTelefone, servicoId, data, horario } = body;
  if (!slug || !clienteNome || !clienteTelefone || !servicoId || !data || !horario) {
    return n8nError(
      'slug, clienteNome, clienteTelefone, servicoId, data e horario são obrigatórios',
      'MISSING_PARAM'
    );
  }

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true, nome: true },
    });
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const servico = await prisma.servico.findFirst({
      where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
      include: { profissionais: { where: { ativo: true }, select: { id: true } } },
    });
    if (!servico) return n8nError('Serviço não encontrado', 'NOT_FOUND', 404);

    // Resolver profissional
    const profIds = servico.profissionais.map(p => p.id);
    let profId: string | null = null;

    if (body.profissionalId && body.profissionalId !== 'qualquer' && profIds.includes(body.profissionalId)) {
      profId = body.profissionalId;
    } else {
      const profValido = await prisma.profissional.findFirst({
        where: { id: { in: profIds }, tenantId: clinica.tenantId, ativo: true },
        select: { id: true },
      });
      if (!profValido) return n8nError('Nenhum profissional disponível', 'NO_PROFESSIONAL', 400);
      profId = profValido.id;
    }

    // Calcular datas no fuso Fortaleza
    const dataHora = new Date(`${data}T${horario}:00-03:00`);
    const fimDataHora = new Date(
      dataHora.getTime() + (servico.duracaoMinutos + (servico.bufferTimeMinutes ?? 0)) * 60000
    );

    // Verificar conflito
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId: clinica.tenantId,
        profissionalId: profId,
        status: { not: 'cancelado' },
        dataHora: { lt: fimDataHora },
        fimDataHora: { gt: dataHora },
      },
    });
    if (conflito) return n8nError('Horário não disponível', 'SLOT_CONFLICT', 409);

    // Buscar ou criar paciente
    const telefoneClean = clienteTelefone.replace(/\D/g, '');
    let paciente = await prisma.paciente.findFirst({
      where: {
        tenantId: clinica.tenantId,
        OR: [
          { telefone: telefoneClean },
          { telefone: clienteTelefone },
          { telefone: { endsWith: telefoneClean.slice(-8) } },
        ],
      },
    });
    if (!paciente) {
      paciente = await prisma.paciente.create({
        data: {
          nome: clienteNome.trim(),
          telefone: clienteTelefone.trim(),
          tipoAtendimento: 'particular',
          tenantId: clinica.tenantId,
        },
      });
    }

    const protocolo = gerarProtocolo();
    const agendamento = await prisma.agendamento.create({
      data: {
        eventoId: `bot-${protocolo}-${Date.now()}`,
        pacienteId: paciente.id,
        profissionalId: profId,
        servicoId: servico.id,
        dataHora,
        fimDataHora,
        durationMinutes: servico.duracaoMinutos,
        status: 'confirmado',
        categoria: 'atendimento',
        tipoAtendimento: 'particular',
        tenantId: clinica.tenantId,
        observacoes: `Bot WhatsApp${body.origem ? ` (${body.origem})` : ''} — Protocolo #${protocolo}`,
      },
    });

    const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });

    return n8nSuccess({
      agendamentoId: agendamento.id,
      protocolo,
      confirmacao: `Agendamento confirmado para ${dataFormatada} às ${horario}`,
    });
  } catch (err) {
    console.error('[n8n/agenda/criar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
