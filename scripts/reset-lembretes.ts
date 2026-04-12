/**
 * Reset lembretes marcados como enviados mas sem envio confirmado no MarketingEnvio.
 *
 * Uso:
 *   npx tsx scripts/reset-lembretes.ts
 *   npx tsx scripts/reset-lembretes.ts --dry-run    (apenas mostra, não altera)
 */
import prisma from '../src/lib/prisma';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`[reset-lembretes] ${DRY_RUN ? '(DRY RUN)' : '(REAL)'} — iniciando\n`);

  // Agendamentos com lembreteEnviado = true mas SEM registro de envio bem-sucedido
  const marcados = await prisma.agendamento.findMany({
    where: { lembreteEnviado: true },
    select: { id: true, tenantId: true, dataHora: true, paciente: { select: { nome: true, telefone: true } } },
  });

  let semRegistro = 0;
  const idsParaReset: string[] = [];

  for (const ag of marcados) {
    const envio = await prisma.marketingEnvio.findFirst({
      where: {
        tenantId: ag.tenantId,
        clienteTelefone: ag.paciente.telefone ?? '',
        tipo: { in: ['lembrete', 'lembrete_confirmacao'] },
        status: 'enviado',
        criadoEm: { gte: new Date(ag.dataHora.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (!envio) {
      semRegistro++;
      idsParaReset.push(ag.id);
      console.log(`  → ${ag.id} | ${ag.paciente.nome} | ${ag.dataHora.toISOString().slice(0, 16)} | SEM envio confirmado`);
    }
  }

  console.log(`\nTotal marcados: ${marcados.length}`);
  console.log(`Sem envio confirmado: ${semRegistro}`);

  if (idsParaReset.length === 0) {
    console.log('\nNada a resetar.');
    await prisma.$disconnect();
    return;
  }

  if (!DRY_RUN) {
    const { count } = await prisma.agendamento.updateMany({
      where: { id: { in: idsParaReset } },
      data: { lembreteEnviado: false },
    });
    console.log(`\n✓ ${count} agendamentos resetados para lembreteEnviado = false`);
  } else {
    console.log(`\n[dry-run] ${idsParaReset.length} agendamentos seriam resetados`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
