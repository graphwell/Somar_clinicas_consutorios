/**
 * Corrige agendamentos do link público / bot que foram criados
 * erroneamente como 'confirmado' ou 'em_atendimento'.
 * Rodar: npx tsx scripts/fix-status.ts
 */
import prisma from '../src/lib/prisma';

async function main() {
  const resultado = await prisma.agendamento.updateMany({
    where: {
      origemAgendamento: { in: ['link_publico', 'whatsapp_bot', 'bot'] },
      status: { in: ['confirmado', 'em_atendimento'] },
      dataHora: { gte: new Date() },
    },
    data: { status: 'pendente' },
  });

  console.log(`✅ ${resultado.count} agendamento(s) corrigido(s) para 'pendente'`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
