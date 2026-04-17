import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const ps = await prisma.produto.findMany({ select: { nome: true, imageUrl: true } });
  ps.forEach(p => console.log(`${p.imageUrl || 'SEM_URL'} | ${p.nome}`));
  await prisma.$disconnect();
}
main().catch(console.error);
