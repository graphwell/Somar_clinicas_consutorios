import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/lembretes
 * Envia lembrete 24h antes e aguarda confirmação via WhatsApp.
 * Cron: 0 11 * * * (11:00 UTC = 08:00 Fortaleza)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret && auth !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Janela: amanhã 00:00–23:59 no fuso Fortaleza (UTC-3)
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setUTCHours(3, 0, 0, 0);       // 00:00 Fortaleza
  const amanhaFim = new Date(amanha);
  amanhaFim.setUTCHours(26, 59, 59, 999); // 23:59 Fortaleza

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      dataHora:       { gte: amanha, lte: amanhaFim },
      status:         'pendente',
      lembreteEnviado: false,
    },
    include: {
      paciente:     true,
      servico:      { select: { nome: true } },
      profissional: { select: { nome: true } },
      clinica:      { select: { nome: true } },
    },
  });

  let enviados = 0;
  const erros: string[] = [];

  for (const ag of agendamentos) {
    const hora = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(ag.dataHora);
    const data = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza', weekday: 'long', day: '2-digit', month: '2-digit',
    }).format(ag.dataHora);

    const mensagem =
      `Olá ${ag.paciente.nome.split(' ')[0]}! ` +
      `Lembrando seu agendamento amanhã:\n\n` +
      `📋 ${ag.servico?.nome ?? 'Consulta'}\n` +
      `📅 ${data} às ${hora}\n` +
      `🏢 ${ag.clinica.nome}\n\n` +
      `Para *CONFIRMAR* responda: *SIM*\n` +
      `Para cancelar responda: *NÃO*`;

    try {
      await sendAndLog({
        tenantId:          ag.tenantId,
        tipo:              'lembrete_confirmacao',
        clienteNome:       ag.paciente.nome,
        clienteTelefone:   ag.paciente.telefone,
        mensagemEnviada:   mensagem,
      });

      await prisma.agendamento.update({
        where: { id: ag.id },
        data:  { lembreteEnviado: true },
      });

      enviados++;
    } catch (err) {
      console.error('[cron/lembretes] erro ao enviar para', ag.paciente.telefone, err);
      erros.push(ag.id);
    }

    // Delay anti-ban entre envios
    await new Promise(r => setTimeout(r, 3000));
  }

  return NextResponse.json({ ok: true, enviados, erros, timestamp: new Date().toISOString() });
}
