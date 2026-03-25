const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const clinicas = await prisma.clinica.findMany();
  console.log(JSON.stringify(clinicas, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
