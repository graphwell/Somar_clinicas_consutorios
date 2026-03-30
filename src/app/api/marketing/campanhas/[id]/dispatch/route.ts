import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { sendAndLog, applyTemplate } from '@/lib/marketing-helpers';

/** Busca pacientes alvo conforme o filtro da campanha */
async function getTargetPatients(tenantId: string, campanha: any) {
  const base = { tenantId, deletedAt: null, telefone: { not: null } } as any;

  if (campanha.tipo === 'aniversariantes') {
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const dia = hoje.getDate();
    // Pacientes que fazem aniversário hoje
    const todos = await prisma.paciente.findMany({ where: base });
    return todos.filter(p => {
      if (!p.dataNascimento) return false;
      const d = new Date(p.dataNascimento);
      return d.getMonth() + 1 === mes && d.getDate() === dia;
    });
  }

  if (campanha.tipo === 'inativos') {
    const dias = campanha.filtroInativoDias ?? 30;
    const cutoff = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    return prisma.paciente.findMany({
      where: {
        ...base,
        OR: [
          { ultimaVisita: { lt: cutoff } },
          { ultimaVisita: null },
        ],
      },
    });
  }

  if (campanha.tipo === 'servico' && campanha.filtroServico) {
    // Pacientes que já agendaram esse serviço
    const agendamentos = await prisma.agendamento.findMany({
      where: { tenantId, servico: { nome: campanha.filtroServico } },
      select: { pacienteId: true },
      distinct: ['pacienteId'],
    });
    const ids = agendamentos.map(a => a.pacienteId);
    return prisma.paciente.findMany({ where: { ...base, id: { in: ids } } });
  }

  // tipo === 'todos'
  return prisma.paciente.findMany({ where: base });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Não podemos usar getSessionInfo() dentro do stream (headers só funcionam no contexto da request)
  // Então obtemos antes de criar o stream
  let tenantId: string;
  try {
    const session = await getSessionInfo();
    tenantId = session.tenantId;
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const campanha = await prisma.campanhaAviso.findFirst({ where: { id, tenantId } });
  if (!campanha) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  if (campanha.status === 'enviando') return NextResponse.json({ error: 'Campanha já está sendo disparada' }, { status: 409 });

  const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
  const pacientes = await getTargetPatients(tenantId, campanha);

  await prisma.campanhaAviso.update({
    where: { id },
    data: { status: 'enviando', totalEnviado: 0, totalErros: 0 },
  });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (data: object) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      emit({ type: 'start', total: pacientes.length });

      let enviados = 0;
      let erros = 0;

      for (const paciente of pacientes) {
        if (!paciente.telefone) { erros++; continue; }

        const mensagem = applyTemplate(campanha.mensagem, {
          nome: paciente.nome.split(' ')[0],
          clinica: clinica?.nome ?? 'Clínica',
        });

        const result = await sendAndLog({
          tenantId,
          tipo: 'campanha',
          pacienteId: paciente.id,
          pacienteNome: paciente.nome,
          pacienteTelefone: paciente.telefone,
          mensagem,
          campanhaId: id,
        });

        if (result.success) enviados++; else erros++;

        emit({ type: 'progress', enviados, erros, total: pacientes.length, nome: paciente.nome });

        // Delay de 1.5s para evitar bloqueio pelo WhatsApp
        await new Promise(r => setTimeout(r, 1500));
      }

      await prisma.campanhaAviso.update({
        where: { id },
        data: {
          status: 'concluida',
          totalEnviado: enviados,
          totalErros: erros,
          concluidoEm: new Date(),
        },
      });

      emit({ type: 'done', enviados, erros, total: pacientes.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
