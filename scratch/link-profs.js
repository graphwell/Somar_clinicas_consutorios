
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function link() {
  const tenantId = 'tenant_89135e90';
  console.log(`Linking all professionals to all services for tenant: ${tenantId}`);

  try {
    const services = await prisma.servico.findMany({ where: { tenantId } });
    const professionals = await prisma.profissional.findMany({ where: { tenantId } });

    console.log(`Found ${services.length} services and ${professionals.length} professionals.`);

    for (const service of services) {
      console.log(`Linking service: ${service.nome}`);
      await prisma.servico.update({
        where: { id: service.id },
        data: {
          profissionais: {
            connect: professionals.map(p => ({ id: p.id }))
          }
        }
      });
    }

    console.log('SUCCESS: All professionals linked to all services for this clinic.');
  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

link();
