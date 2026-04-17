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

  const slug = body.slug;
  const clienteNome = body.clienteNome || (body as any).nome || (body as any).pacienteNome;
  const clienteTelefone = body.clienteTelefone || (body as any).pacienteTelefone;
  let servicoId = body.servicoId;
  let tenantId = (body as any).tenantId;

  let data = body.data;
  let horario = body.horario;

  // Fallback caso o bot n8n mande "dataHora" inteiro (ex: "2024-04-10T14:30:00Z")
  if ((body as any).dataHora && (!data || !horario)) {
    const dObj = new Date((body as any).dataHora);
    // Extrai no fuso de Fortaleza para que o construtor depois não mude o dia
    const fDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', dateStyle: 'short' }).format(dObj); // YYYY-MM-DD
    const fTime = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', timeStyle: 'short' }).format(dObj); // HH:mm
    data = fDate;
    horario = fTime;
  }

  if (!slug && !tenantId) return n8nError('Parâmetro tenantId ou slug é obrigatório', 'MISSING_TENANT', 400);
  if (!clienteNome) return n8nError('O nome do cliente é obrigatório para o agendamento', 'MISSING_NAME', 400);
  if (!clienteTelefone) return n8nError('O telefone do cliente é obrigatório', 'MISSING_PHONE', 400);
  if (!data || !horario) return n8nError('Data e horário são obrigatórios. Certifique-se de coletar o dia e a hora.', 'MISSING_DATETIME', 400);

  try {
    let clinica = null;
    if (slug) {
      clinica = await prisma.clinica.findUnique({
        where: { slug },
        select: { tenantId: true, nome: true },
      });
    } else if (tenantId) {
      clinica = await prisma.clinica.findUnique({
        where: { tenantId },
        select: { tenantId: true, nome: true },
      });
    }

    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);
    tenantId = clinica.tenantId;

    // ── Verificar se o dia está bloqueado (feriado / fechamento) ──────────────
    if (data) {
      const [_a, _m, _d] = data.split('-').map(Number);
      const inicioDia = new Date(Date.UTC(_a, _m - 1, _d, 0, 0, 0));
      const fimDia    = new Date(Date.UTC(_a, _m - 1, _d, 23, 59, 59));
      const diaBloq = await prisma.diaBloqueado.findFirst({
        where: { tenantId: clinica.tenantId, ativo: true, data: { gte: inicioDia, lte: fimDia } },
      });
      if (diaBloq) {
        return n8nSuccess({
          bloqueado: true,
          msgBot: diaBloq.mensagem,
          msgConfirmacao: diaBloq.mensagem,
        });
      }
    }


    // No modo N8N puro (bot antigo), o servicoId pode faltar se não foi bem amarrado
    // Se faltar servicoId, busco o primeiro ativo para não quebrar a transição
    if (!servicoId) {
      const firstServ = await prisma.servico.findFirst({
        where: { tenantId: clinica.tenantId, ativo: true },
        select: { id: true },
      });
      if (firstServ) servicoId = firstServ.id;
      else return n8nError('Serviço não informado e clínica não tem serviços', 'NOT_FOUND', 404);
    }

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

    // Calcular datas no fuso Fortaleza (UTC-3): somar 3h para obter UTC
    const [_ano, _mes, _dia] = data.split('-').map(Number);
    const [_hora, _min] = horario.split(':').map(Number);
    const dataHora = new Date(Date.UTC(_ano, _mes - 1, _dia, _hora + 3, _min, 0, 0));
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
        status: 'pendente',
        categoria: 'atendimento',
        tipoAtendimento: 'particular',
        tenantId: clinica.tenantId,
        origemAgendamento: 'bot',
        observacoes: `Bot WhatsApp${body.origem ? ` (${body.origem})` : ''} — Protocolo #${protocolo}`,
      },
    });

    const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });

    const servicoDetails = await prisma.servico.findUnique({
      where: { id: servicoId! },
      select: { nome: true },
    });
    const profissional = await prisma.profissional.findUnique({
      where: { id: profId! },
      select: { nome: true },
    });

    const msgConfirmacao =
      `Agendamento confirmado!\n\n` +
      `Protocolo: #${protocolo}\n` +
      `Data: ${dataFormatada} as ${horario}\n` +
      (servicoDetails ? `Servico: ${servicoDetails.nome}\n` : '') +
      (profissional ? `Profissional: ${profissional.nome}\n` : '') +
      `\nAte la!`;

    // Notificação WA em background
    import('@/lib/whatsapp-service')
      .then(({ notificarNovoAgendamento }) => notificarNovoAgendamento(agendamento.id))
      .catch(e => console.error('[WA]', e));

    return n8nSuccess({
      agendamentoId: agendamento.id,
      protocolo,
      confirmacao: `Agendamento confirmado para ${dataFormatada} às ${horario}`,
      msgConfirmacao,
      msgBot: msgConfirmacao,
    });
  } catch (err) {
    console.error('[n8n/agenda/criar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
