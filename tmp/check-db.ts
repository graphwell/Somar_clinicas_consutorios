import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const clinicas = await prisma.clinica.findMany();
  console.log(JSON.stringify(clinicas, null, 2));
}
main().catch(console.error);
