import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAndLog, applyTemplate, DEFAULT_LEMBRETE_TEMPLATE, DEFAULT_ANIVERSARIO_TEMPLATE } from '@/lib/marketing-helpers';

/**
 * Cron job diário de marketing.
 * Deve ser chamado via GET com header Authorization: Bearer <CRON_SECRET>
 * Exemplo de configuração no vercel.json:
 *   { "crons": [{ "path": "/api/cron/marketing-daily", "schedule": "0 8 * * *" }] }
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret && auth !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, { lembretes: number; aniversarios: number; erros: number }> = {};

  const configs = await prisma.marketingConfig.findMany({
    where: { OR: [{ lembreteAtivo: true }, { aniversarioAtivo: true }] },
  });

  for (const config of configs) {
    const { tenantId } = config;
    results[tenantId] = { lembretes: 0, aniversarios: 0, erros: 0 };

    const clinica = await prisma.clinica.findUnique({ where: { tenantId } });

    // ── Lembretes ────────────────────────────────────────────────
    if (config.lembreteAtivo) {
      const horas = config.lembreteAntecedencia;
      const de = new Date(Date.now() + horas * 60 * 60 * 1000);
      const ate = new Date(de.getTime() + 60 * 60 * 1000); // janela de 1h

      const agendamentos = await prisma.agendamento.findMany({
        where: {
          tenantId,
          dataHora: { gte: de, lt: ate },
          status: { in: ['pendente', 'confirmado'] },
        },
        include: { paciente: true, servico: true, profissional: true },
      });

      for (const ag of agendamentos) {
        if (!ag.paciente.telefone) continue;

        // Evita enviar lembrete duplicado
        const jaEnviou = await prisma.marketingEnvio.findFirst({
          where: {
            tenantId,
            tipo: 'lembrete',
            pacienteId: ag.pacienteId,
            enviadoEm: { gte: new Date(Date.now() - 25 * 60 * 60 * 1000) },
          },
        });
        if (jaEnviou) continue;

        const dataHora = new Date(ag.dataHora);
        const mensagem = applyTemplate(config.lembreteTemplate || DEFAULT_LEMBRETE_TEMPLATE, {
          nome: ag.paciente.nome.split(' ')[0],
          data: dataHora.toLocaleDateString('pt-BR'),
          hora: dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          servico: ag.servico?.nome ?? 'Consulta',
          profissional: ag.profissional?.nome ?? '',
          clinica: clinica?.nome ?? 'Clínica',
        });

        const res = await sendAndLog({
          tenantId,
          tipo: 'lembrete',
          pacienteId: ag.pacienteId,
          pacienteNome: ag.paciente.nome,
          pacienteTelefone: ag.paciente.telefone,
          mensagem,
        });

        if (res.success) results[tenantId].lembretes++;
        else results[tenantId].erros++;

        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // ── Aniversários ─────────────────────────────────────────────
    if (config.aniversarioAtivo) {
      const hoje = new Date();
      const mes = hoje.getMonth() + 1;
      const dia = hoje.getDate();

      const todos = await prisma.paciente.findMany({
        where: { tenantId, dataNascimento: { not: null }, deletedAt: null },
      });

      const aniversariantes = todos.filter(p => {
        if (!p.dataNascimento) return false;
        const d = new Date(p.dataNascimento);
        return d.getMonth() + 1 === mes && d.getDate() === dia;
      });

      for (const paciente of aniversariantes) {
        if (!paciente.telefone) continue;

        // Evita duplicata no mesmo dia
        const jaEnviou = await prisma.marketingEnvio.findFirst({
          where: {
            tenantId,
            tipo: 'aniversario',
            pacienteId: paciente.id,
            enviadoEm: { gte: new Date(hoje.setHours(0, 0, 0, 0)) },
          },
        });
        if (jaEnviou) continue;

        const mensagem = applyTemplate(config.aniversarioTemplate || DEFAULT_ANIVERSARIO_TEMPLATE, {
          nome: paciente.nome.split(' ')[0],
          desconto: String(config.aniversarioDesconto),
          clinica: clinica?.nome ?? 'Clínica',
        });

        const res = await sendAndLog({
          tenantId,
          tipo: 'aniversario',
          pacienteId: paciente.id,
          pacienteNome: paciente.nome,
          pacienteTelefone: paciente.telefone,
          mensagem,
        });

        if (res.success) results[tenantId].aniversarios++;
        else results[tenantId].erros++;

        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
