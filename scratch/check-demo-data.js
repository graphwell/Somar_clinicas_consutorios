const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'demo-barbearia';

  const profs = await prisma.profissional.findMany({
    where: { tenantId, ativo: true },
    select: { id: true, nome: true },
  });
  console.log('Profissionais:', JSON.stringify(profs, null, 2));

  const servicos = await prisma.servico.findMany({
    where: { tenantId },
    select: { id: true, nome: true, preco: true, duracaoMinutos: true },
    take: 15,
  });
  console.log('Serviços:', JSON.stringify(servicos, null, 2));

  const pacientes = await prisma.paciente.findMany({
    where: { tenantId },
    select: { id: true, nome: true },
    take: 20,
  });
  console.log('Pacientes:', JSON.stringify(pacientes, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
