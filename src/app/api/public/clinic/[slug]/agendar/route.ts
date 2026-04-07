import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/wasender';

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function dateToFortalezaMin(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') * 60
       + parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
}
function formatarDataBR(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    weekday: 'long', day: '2-digit', month: 'long',
  }).format(date);
}

/**
 * POST /api/public/clinic/[slug]/agendar
 * Body: {
 *   servicoId, profissionalId, data, horario,
 *   clienteNome, clienteTelefone, tipoPagamento
 * }
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;

  try {
    const body = await req.json();
    const { servicoId, profissionalId, data, horario, clienteNome, clienteTelefone, tipoPagamento } = body;

    if (!servicoId || !data || !horario || !clienteNome || !clienteTelefone) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const telefoneLimpo = clienteTelefone.replace(/\D/g, '');

    // Buscar clínica pelo slug
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: {
        id: true,
        tenantId: true,
        nome: true,
        aceitaPagamento: true,
        whatsappInstances: {
          where: { status: 'EM_USO' },
          select: { sessionId: true, bearerToken: true, plataforma: true },
          take: 1,
        },
      },
    });
    if (!clinica) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Validar serviço
    const servico = await prisma.servico.findFirst({
      where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
      select: { id: true, nome: true, duracaoMinutos: true, profissionais: { select: { id: true } } },
    });
    if (!servico) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

    // Resolver profissional
    let profId: string | null = profissionalId && profissionalId !== 'qualquer' ? profissionalId : null;

    if (!profId) {
      // Escolher profissional com mais horários livres (simplificado: pegar o primeiro ativo do serviço)
      const profIds = servico.profissionais.map(p => p.id);
      if (profIds.length > 0) profId = profIds[0];
    }

    if (profId) {
      const profValido = await prisma.profissional.findFirst({
        where: { id: profId, tenantId: clinica.tenantId, ativo: true },
        select: { id: true },
      });
      if (!profValido) profId = null;
    }

    // Rate limit: máx 3 agendamentos por telefone por dia
    const inicioDia = new Date(data + 'T00:00:00-03:00');
    const fimDia = new Date(data + 'T23:59:59-03:00');
    const countHoje = await prisma.agendamento.count({
      where: {
        tenantId: clinica.tenantId,
        dataHora: { gte: inicioDia, lte: fimDia },
        paciente: { telefone: telefoneLimpo },
        status: { not: 'cancelado' },
      },
    });
    if (countHoje >= 3) {
      return NextResponse.json(
        { error: 'Limite de 3 agendamentos por telefone/dia atingido' },
        { status: 429 }
      );
    }

    // Calcular dataHora em UTC (Fortaleza = UTC-3)
    const [hora, minuto] = horario.split(':').map(Number);
    const dataHora = new Date(data + 'T00:00:00-03:00');
    dataHora.setUTCHours(hora + 3, minuto, 0, 0);
    const fimDataHora = new Date(dataHora.getTime() + servico.duracaoMinutos * 60000);

    // Verificar conflito de slot
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId: clinica.tenantId,
        profissionalId: profId ?? undefined,
        status: { not: 'cancelado' },
        dataHora: { lt: fimDataHora },
        fimDataHora: { gt: dataHora },
      },
    });
    if (conflito) {
      return NextResponse.json(
        { error: 'Horário não está mais disponível. Por favor, escolha outro.' },
        { status: 409 }
      );
    }

    // Buscar ou criar paciente
    let paciente = await prisma.paciente.findFirst({
      where: { telefone: telefoneLimpo, tenantId: clinica.tenantId },
    });
    if (!paciente) {
      paciente = await prisma.paciente.create({
        data: {
          nome: clienteNome.trim(),
          telefone: telefoneLimpo,
          tenantId: clinica.tenantId,
        },
      });
    }

    // Criar agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId: clinica.tenantId,
        pacienteId: paciente.id,
        profissionalId: profId,
        servicoId: servico.id,
        dataHora,
        fimDataHora,
        durationMinutes: servico.duracaoMinutos,
        status: 'confirmado',
        tipoPagamento: tipoPagamento || 'hora',
        origemAgendamento: 'link_publico',
        eventoId: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      },
    });

    const protocolo = agendamento.id.slice(-8).toUpperCase();

    // Enviar confirmação via WhatsApp (fail-safe)
    try {
      const instancia = clinica.whatsappInstances[0];
      if (instancia) {
        const primeiroNome = clienteNome.trim().split(' ')[0];
        const mensagem =
          `✅ *Agendamento confirmado!*\n\n` +
          `Olá, *${primeiroNome}*!\n\n` +
          `📋 *${servico.nome}*\n` +
          `📅 ${formatarDataBR(dataHora)}\n` +
          `🕐 ${horario}\n` +
          `🏠 ${clinica.nome}\n\n` +
          `Protocolo: \`${protocolo}\`\n\n` +
          `_Até logo!_ 🙏`;

        const to = telefoneLimpo.startsWith('55') ? telefoneLimpo : `55${telefoneLimpo}`;
        await sendWhatsAppMessage(instancia.plataforma, instancia.sessionId, instancia.bearerToken, to, mensagem);
      }
    } catch (waErr) {
      console.warn('[agendar] WhatsApp não enviado:', waErr);
    }

    return NextResponse.json({ success: true, protocolo, agendamentoId: agendamento.id });
  } catch (err) {
    console.error('[public/agendar]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
