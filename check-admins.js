const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const admins = await prisma.usuario.findMany({
    where: {
      role: 'admin'
    },
    select: {
      id: true,
      nome: true,
      email: true,
      tenantId: true,
      role: true
    }
  });

  console.log(`Usuários com 'admin' role:`);
  console.table(admins);

  const masterTenant = await prisma.clinica.findFirst({
    where: { tenantId: 'demo-synka-master' }
  });

  console.log(`\nClínica Master exists: `, !!masterTenant);
}

check().catch(console.error).finally(() => prisma.$disconnect());
