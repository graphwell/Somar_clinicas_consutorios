import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { TPL, formatarDataBR, formatarHoraBR } from '@/lib/whatsapp-templates';

export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * GET /api/cron/lembretes
 * Envia lembretes por tenant respeitando lembreteAntecedenciaHoras.
 * Cron: a cada hora (vercel.json) — a lógica filtra a janela correta.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret && auth !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Buscar todos os tenants com lembrete ativo
  const configs = await prisma.marketingConfig.findMany({
    where: { lembreteAtivo: true },
    include: { clinica: { select: { nome: true } } },
  });

  let totalEnviados = 0;
  const erros: string[] = [];

  for (const mc of configs) {
    const horas = mc.lembreteAntecedenciaHoras ?? 24;

    // Janela: agendamentos que ocorrem exatamente em `horas` horas (±15 min)
    const agora = new Date();
    const alvo  = new Date(agora.getTime() + horas * 60 * 60 * 1000);
    const inicio = new Date(alvo.getTime() - 15 * 60 * 1000);
    const fim    = new Date(alvo.getTime() + 15 * 60 * 1000);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId:        mc.tenantId,
        dataHora:        { gte: inicio, lte: fim },
        status:          { in: ['pendente', 'confirmado'] },
        lembreteEnviado: false,
      },
      include: {
        paciente: { select: { nome: true, telefone: true } },
        servico:  { select: { nome: true } },
      },
    });

    for (const ag of agendamentos) {
      if (!ag.paciente.telefone) continue;

      const mensagem = mc.lembreteTemplate ?? TPL.lembrete({
        nome:    ag.paciente.nome.split(' ')[0],
        servico: ag.servico?.nome ?? 'Consulta',
        data:    formatarDataBR(ag.dataHora),
        hora:    formatarHoraBR(ag.dataHora),
        clinica: (mc as any).clinica?.nome ?? '',
        horas,
      });

      try {
        const r = await sendAndLog({
          tenantId:        ag.tenantId,
          tipo:            'lembrete_confirmacao',
          clienteNome:     ag.paciente.nome,
          clienteTelefone: ag.paciente.telefone,
          mensagemEnviada: mensagem,
          ignorarRisco:    true,
        });

        if (r.success) {
          await prisma.agendamento.update({
            where: { id: ag.id },
            data:  { lembreteEnviado: true },
          });
          totalEnviados++;
        }
      } catch (err) {
        console.error('[cron/lembretes]', ag.id, err);
        erros.push(ag.id);
      }

      await delay(3000); // anti-ban entre envios
    }
  }

  return NextResponse.json({
    ok: true,
    totalEnviados,
    erros,
    timestamp: new Date().toISOString(),
  });
}
