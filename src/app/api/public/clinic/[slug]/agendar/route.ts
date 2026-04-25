import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verificarBlacklist } from '@/lib/blacklist';

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function dateToFortalezaMin(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

function gerarProtocolo(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * POST /api/public/clinic/[slug]/agendar
 * Body: {
 *   servicoId: string
 *   profissionalId: string  // uuid ou 'qualquer'
 *   data: string            // YYYY-MM-DD
 *   horario: string         // HH:MM
 *   clienteNome: string
 *   clienteTelefone: string
 *   tipoPagamento: 'hora' | 'total' | 'sinal'
 * }
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;

  let body: {
    servicoId?: string;
    profissionalId?: string;
    data?: string;
    horario?: string;
    clienteNome?: string;
    clienteTelefone?: string;
    tipoPagamento?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const { servicoId, profissionalId: profIdParam, data, horario, clienteNome, clienteTelefone, tipoPagamento } = body;

  if (!servicoId || !data || !horario || !clienteNome || !clienteTelefone) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: servicoId, data, horario, clienteNome, clienteTelefone' },
      { status: 400 }
    );
  }

  try {
    // 1. Buscar clínica pelo slug
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true, nome: true, adminPhone: true },
    });

    if (!clinica) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    // 1b. Verificar dia bloqueado
    const dataInicio = new Date(`${data}T00:00:00-03:00`);
    const dataFim = new Date(`${data}T23:59:59-03:00`);
    const diaBloqueado = await prisma.diaBloqueado.findFirst({
      where: {
        tenantId: clinica.tenantId,
        ativo: true,
        data: { gte: dataInicio, lte: dataFim },
      },
    });
    if (diaBloqueado) {
      return NextResponse.json(
        { error: diaBloqueado.mensagem },
        { status: 422 }
      );
    }

    // Rate limiting: máx 3 agendamentos por telefone por dia nesta clínica
    const telefoneDigits = clienteTelefone.replace(/\D/g, '');
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    const totalHoje = await prisma.agendamento.count({
      where: {
        tenantId: clinica.tenantId,
        origemAgendamento: 'link_publico',
        dataHora: { gte: hoje },
        paciente: { telefone: { endsWith: telefoneDigits.slice(-8) } },
      },
    });
    if (totalHoje >= 3) {
      return NextResponse.json(
        { error: 'Limite de agendamentos atingido. Entre em contato com a clinica.' },
        { status: 429 }
      );
    }

    // 2. Buscar serviço
    const servico = await prisma.servico.findFirst({
      where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
      include: {
        profissionais: { where: { ativo: true }, select: { id: true } },
      },
    });

    if (!servico) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    // 3. Resolver profissional
    let profId: string | null = null;
    const profIds = servico.profissionais.map(p => p.id);

    if (profIdParam && profIdParam !== 'qualquer' && profIds.includes(profIdParam)) {
      profId = profIdParam;
    } else {
      // Escolher o primeiro profissional ativo do serviço
      const profValido = await prisma.profissional.findFirst({
        where: { id: { in: profIds }, tenantId: clinica.tenantId, ativo: true },
      });
      if (!profValido) {
        return NextResponse.json({ error: 'Nenhum profissional disponível' }, { status: 400 });
      }
      profId = profValido.id;
    }

    // 4. Calcular dataHora e fimDataHora no fuso de Fortaleza
    const [hh, mm] = horario.split(':').map(Number);
    const dataHora = new Date(`${data}T${horario}:00-03:00`);
    const fimDataHora = new Date(dataHora.getTime() + (servico.duracaoMinutos + (servico.bufferTimeMinutes ?? 0)) * 60000);

    // 5. Verificar conflitos
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId: clinica.tenantId,
        profissionalId: profId,
        status: { not: 'cancelado' },
        OR: [
          { dataHora: { lt: fimDataHora }, fimDataHora: { gt: dataHora } },
        ],
      },
    });

    if (conflito) {
      return NextResponse.json({ error: 'Horário não disponível. Por favor, escolha outro.' }, { status: 409 });
    }

    // 6. Buscar ou criar paciente
    const telefoneClean = clienteTelefone.replace(/\D/g, '');
    let paciente = await prisma.paciente.findFirst({
      where: { tenantId: clinica.tenantId, telefone: { contains: telefoneClean.slice(-8) } },
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

    // 6b. Verificar blacklist e inadimplência
    const { bloqueado, liberadoEm } = await verificarBlacklist(paciente.id, prisma);
    if (bloqueado) {
      return NextResponse.json(
        { error: 'PACIENTE_BLOQUEADO', liberadoEm: liberadoEm?.toISOString() ?? null },
        { status: 403 }
      );
    }
    const assinaturaInadimplente = await prisma.assinaturaCliente.findFirst({
      where: { pacienteId: paciente.id, tenantId: clinica.tenantId, status: 'inadimplente' },
      select: { planoId: true },
    });
    if (assinaturaInadimplente) {
      return NextResponse.json(
        { error: 'ASSINANTE_INADIMPLENTE' },
        { status: 403 }
      );
    }

    // 7. Criar agendamento
    const protocolo = gerarProtocolo();
    const agendamento = await prisma.agendamento.create({
      data: {
        eventoId: `pub-${protocolo}-${Date.now()}`,
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
        origemAgendamento: 'link_publico',
        observacoes: `Agendamento online — Protocolo #${protocolo}. Pagamento: ${tipoPagamento ?? 'hora'}`,
      },
    });

    // 8. Notificação WA em background — não bloqueia resposta
    import('@/lib/whatsapp-service')
      .then(({ notificarNovoAgendamento }) => notificarNovoAgendamento(agendamento.id))
      .catch(e => console.warn('[agendar/public] WhatsApp:', e));

    return NextResponse.json({ success: true, protocolo, agendamentoId: agendamento.id });
  } catch (err) {
    console.error('[public/agendar]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
