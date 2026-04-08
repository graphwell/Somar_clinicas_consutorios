const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const newUsers = await prisma.usuario.findMany({
    where: {
      createdAt: {
        gte: threeDaysAgo
      }
    },
    select: {
      id: true,
      nome: true,
      email: true,
      createdAt: true
    }
  });

  console.log(`Usuários criados nos últimos 3 dias (${threeDaysAgo.toISOString()}):`);
  console.table(newUsers);
}

check().catch(console.error).finally(() => prisma.$disconnect());
