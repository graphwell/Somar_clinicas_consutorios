import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { processarTemplate, TEMPLATE_LEMBRETE_PADRAO, TEMPLATE_ANIVERSARIO_PADRAO } from '@/lib/marketing-utils';

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
    const nomeClinica = config.nomeClinica || clinica?.nome || 'Clínica';

    // ── Lembretes ────────────────────────────────────────────────
    if (config.lembreteAtivo) {
      const horas = config.lembreteAntecedenciaHoras;
      const de = new Date(Date.now() + horas * 60 * 60 * 1000);
      const ate = new Date(de.getTime() + 60 * 60 * 1000);

      const agendamentos = await prisma.agendamento.findMany({
        where: { tenantId, dataHora: { gte: de, lt: ate }, status: { in: ['pendente', 'confirmado'] } },
        include: { paciente: true, servico: true, profissional: true },
      });

      for (const ag of agendamentos) {
        if (!ag.paciente.telefone) continue;

        const jaEnviou = await prisma.marketingEnvio.findFirst({
          where: {
            tenantId, tipo: 'lembrete', clienteTelefone: ag.paciente.telefone,
            enviadoEm: { gte: new Date(Date.now() - 25 * 60 * 60 * 1000) },
          },
        });
        if (jaEnviou) continue;

        const dataHora = new Date(ag.dataHora);
        const profNome = ag.profissional?.nome;
        const mensagem = processarTemplate(config.lembreteTemplate || TEMPLATE_LEMBRETE_PADRAO, {
          nome: ag.paciente.nome.split(' ')[0],
          data: dataHora.toLocaleDateString('pt-BR'),
          hora: dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          servico: ag.servico?.nome ?? 'Consulta',
          profissional: profNome ?? '',
          profissional_linha: profNome ? ` com ${profNome}` : '',
          clinica: nomeClinica,
          link: config.linkConfirmacao ?? '',
        });

        const res = await sendAndLog({
          tenantId, tipo: 'lembrete',
          clienteNome: ag.paciente.nome,
          clienteTelefone: ag.paciente.telefone,
          mensagemEnviada: mensagem,
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
        const d = new Date(p.dataNascimento!);
        return d.getMonth() + 1 === mes && d.getDate() === dia;
      });

      const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      for (const paciente of aniversariantes) {
        if (!paciente.telefone) continue;

        const jaEnviou = await prisma.marketingEnvio.findFirst({
          where: { tenantId, tipo: 'aniversario', clienteTelefone: paciente.telefone, enviadoEm: { gte: inicioDia } },
        });
        if (jaEnviou) continue;

        const mensagem = processarTemplate(config.aniversarioTemplate || TEMPLATE_ANIVERSARIO_PADRAO, {
          nome: paciente.nome.split(' ')[0],
          desconto: String(config.aniversarioDescontoPct),
          clinica: nomeClinica,
        });

        const res = await sendAndLog({
          tenantId, tipo: 'aniversario',
          clienteNome: paciente.nome,
          clienteTelefone: paciente.telefone,
          mensagemEnviada: mensagem,
        });

        if (res.success) results[tenantId].aniversarios++;
        else results[tenantId].erros++;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
