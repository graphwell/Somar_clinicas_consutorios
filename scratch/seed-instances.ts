import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding WhatsApp instances...');

  // 1. Instância Trial (ULTRAMSG)
  await prisma.whatsappInstance.upsert({
    where: { sessionId: 'trial-master-01' },
    update: {},
    create: {
      sessionId: 'trial-master-01',
      bearerToken: 'token_trial_dummy_123', // Em cenário real, os tokens seriam reais
      plataforma: 'ULTRAMSG',
      status: 'LIVRE',
      empresaId: null,
      observacoes: 'Instância para novos clientes (TRIAL)',
    },
  });

  // 2. Instância Produção (WASENDERAPI)
  await prisma.whatsappInstance.upsert({
    where: { sessionId: 'prod-vasender-01' },
    update: {},
    create: {
      sessionId: 'prod-vasender-01',
      bearerToken: 'token_prod_dummy_456',
      plataforma: 'WASENDERAPI',
      status: 'LIVRE',
      empresaId: null,
      observacoes: 'Pool de instâncias pagas (WASENDER)',
    },
  });

  console.log('Seed concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
