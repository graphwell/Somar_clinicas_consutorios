import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('Cleaning up Marta\'s connection to allow REAL test...');

  // 1. Libera qualquer instância que a Marta (tenant_89135e90) esteja segurando
  const result = await prisma.whatsappInstance.updateMany({
    where: { empresaId: 'tenant_89135e90' },
    data: {
      empresaId: null,
      status: 'LIVRE'
    }
  });

  // 2. Garante que a instância UltraMsg Real está LIVRE para ser pega
  const ultraId = process.env.ULTRAMSG_INSTANCE_ID || 'instance168762';
  await prisma.whatsappInstance.updateMany({
    where: { sessionId: ultraId },
    data: {
      empresaId: null,
      status: 'LIVRE',
      plataforma: 'ULTRAMSG'
    }
  });

  console.log(`✅ Conexões antigas limpas (${result.count}). Instância UltraMsg Real liberada para teste.`);
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
