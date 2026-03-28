const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const profs = await prisma.profissional.findMany({
    where: { createdAt: { gte: oneHourAgo } }
  });
  console.log(`--- PROFISSIONAIS CRIADOS NA ÚLTIMA HORA ---`);
  console.log(`Total: ${profs.length}`);
  profs.forEach(p => {
    console.log(`ID: ${p.id} | Nome: ${p.nome} | Tenant: ${p.tenantId}`);
  });
}

debug();
