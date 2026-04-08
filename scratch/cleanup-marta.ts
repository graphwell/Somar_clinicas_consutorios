import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('--- Iniciando Limpeza de Dados Incoerentes ---');

  // Buscar todas as instâncias WaSender que estão vinculadas
  const instances = await prisma.whatsappInstance.findMany({
    where: {
      plataforma: 'WASENDERAPI',
      NOT: { empresaId: null }
    }
  });

  let count = 0;
  for (const inst of instances) {
    const assinatura = await prisma.assinatura.findUnique({
      where: { tenantId: inst.empresaId! }
    });

    // Se não tem assinatura ou é TRIAL, desvincula
    if (!assinatura || assinatura.plano === 'trial') {
      console.log(`[!] Desvinculando WaSender (${inst.sessionId}) de tenant TRIAL: ${inst.empresaId}`);
      await prisma.whatsappInstance.update({
        where: { id: inst.id },
        data: {
          empresaId: null,
          status: 'LIVRE',
          webhookUrl: null,
          numeroWa: null
        }
      });
      count++;
    }
  }

  console.log(`--- Limpeza Concluída: ${count} instâncias liberadas ---`);
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
