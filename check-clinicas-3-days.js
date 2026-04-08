const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const clinicas = await prisma.clinica.findMany({
    where: {
      createdAt: {
        gte: threeDaysAgo
      }
    },
    select: {
      id: true,
      nome: true,
      tenantId: true,
      createdAt: true
    }
  });

  console.log(`Clínicas criadas nos últimos 3 dias (${threeDaysAgo.toISOString()}):`);
  console.table(clinicas);
}

check().catch(console.error).finally(() => prisma.$disconnect());
