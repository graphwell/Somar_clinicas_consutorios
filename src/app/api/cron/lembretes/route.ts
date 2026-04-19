import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { TPL, formatarDataBR, formatarHoraBR } from '@/lib/whatsapp-templates';

export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * GET /api/cron/lembretes
 * Envia lembretes para TODOS os agendamentos de amanhã (dia completo, fuso Fortaleza).
 * Roda uma vez por dia via Vercel Cron (vercel.json: 0 11 * * * = 08:00 BRT).
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    console.error('[cron/lembretes] CRON_SECRET nao configurado!');
    return NextResponse.json({ error: 'Configuracao invalida' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Janela: amanhã 00:00–23:59 no fuso Fortaleza (UTC-3)
  const agora = new Date();
  const inicioBRT = new Date(agora);
  inicioBRT.setDate(inicioBRT.getDate() + 1);
  inicioBRT.setUTCHours(3, 0, 0, 0);   // 00:00 Fortaleza = 03:00 UTC

  const fimBRT = new Date(inicioBRT);
  fimBRT.setUTCHours(26, 59, 59, 999); // 23:59:59 Fortaleza = 02:59:59 UTC do dia seguinte

  // Buscar tenants com lembrete ativo
  const configs = await prisma.marketingConfig.findMany({
    where: { lembreteAtivo: true },
    include: { clinica: { select: { nome: true } } },
  });

  let totalEnviados = 0;
  const erros: string[] = [];

  for (const mc of configs) {
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId:        mc.tenantId,
        dataHora:        { gte: inicioBRT, lte: fimBRT },
        status:          { in: ['pendente', 'confirmado'] },
        lembreteEnviado: false,
      },
      include: {
        paciente:     { select: { nome: true, telefone: true } },
        servico:      { select: { nome: true } },
        profissional: { select: { nome: true } },
      },
    });

    for (const ag of agendamentos) {
      if (!ag.paciente.telefone) continue;

      const horas = mc.lembreteAntecedenciaHoras ?? 24;
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
          console.log(`[cron/lembretes] Enviado: ${ag.id} → ${ag.paciente.telefone}`);
        } else {
          console.warn(`[cron/lembretes] Falha no envio: ${ag.id}`, r);
          erros.push(ag.id);
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
    janela: {
      inicio: inicioBRT.toISOString(),
      fim:    fimBRT.toISOString(),
    },
    totalEnviados,
    erros,
    timestamp: new Date().toISOString(),
  });
}
