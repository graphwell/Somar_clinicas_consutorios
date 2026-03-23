const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clinicas = await prisma.clinica.findMany({
    select: { tenantId: true, nome: true, nicho: true }
  });
  console.log('Clinicas registradas:', clinicas);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
