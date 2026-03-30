import { getSessionInfo } from '@/lib/auth-helpers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { processarTemplate } from '@/lib/marketing-utils';

async function getTargetPatients(tenantId: string, campanha: any) {
  const base = { tenantId, deletedAt: null, telefone: { not: null } } as any;

  if (campanha.tipo === 'aniversariantes') {
    const hoje = new Date();
    const todos = await prisma.paciente.findMany({ where: { ...base, dataNascimento: { not: null } } });
    return todos.filter(p => {
      const d = new Date(p.dataNascimento!);
      return d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
    });
  }

  if (campanha.tipo === 'inativos') {
    const dias = campanha.filtroInativoDias ?? 30;
    const cutoff = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    return prisma.paciente.findMany({
      where: { ...base, OR: [{ ultimaVisita: { lt: cutoff } }, { ultimaVisita: null }] },
    });
  }

  if (campanha.tipo === 'servico' && campanha.filtroServico) {
    const ags = await prisma.agendamento.findMany({
      where: { tenantId, servico: { nome: { equals: campanha.filtroServico, mode: 'insensitive' } } },
      select: { pacienteId: true },
      distinct: ['pacienteId'],
    });
    const ids = ags.map(a => a.pacienteId);
    return prisma.paciente.findMany({ where: { ...base, id: { in: ids } } });
  }

  return prisma.paciente.findMany({ where: base });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let tenantId: string;
  try {
    const session = await getSessionInfo();
    tenantId = session.tenantId;
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const campanha = await prisma.marketingCampanha.findFirst({ where: { id, tenantId } });
  if (!campanha) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  if (campanha.status === 'enviando') {
    return NextResponse.json({ error: 'Campanha já está sendo disparada' }, { status: 409 });
  }

  const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
  const config = await prisma.marketingConfig.findUnique({ where: { tenantId } });
  const pacientes = await getTargetPatients(tenantId, campanha);

  await prisma.marketingCampanha.update({
    where: { id },
    data: { status: 'enviando', totalDestinatarios: pacientes.length, totalEnviados: 0, totalErros: 0 },
  });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      emit({ type: 'start', total: pacientes.length });

      let enviados = 0;
      let erros = 0;

      for (const paciente of pacientes) {
        if (!paciente.telefone) { erros++; continue; }

        const mensagem = processarTemplate(campanha.template, {
          nome: paciente.nome.split(' ')[0],
          clinica: config?.nomeClinica || clinica?.nome || 'Clínica',
        });

        const result = await sendAndLog({
          tenantId,
          tipo: 'campanha',
          clienteNome: paciente.nome,
          clienteTelefone: paciente.telefone,
          mensagemEnviada: mensagem,
        });

        if (result.success) enviados++; else erros++;

        emit({ type: 'progress', enviados, erros, total: pacientes.length, nome: paciente.nome });

        await new Promise(r => setTimeout(r, 1500));
      }

      await prisma.marketingCampanha.update({
        where: { id },
        data: { status: 'concluida', totalEnviados: enviados, totalErros: erros, concluidoEm: new Date() },
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
