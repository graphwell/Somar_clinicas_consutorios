const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- AUDITORIA DE USUÁRIOS ---');
    const users = await prisma.usuario.findMany({
      select: { email: true, role: true, tenantId: true }
    });
    console.log(`Total de usuários: ${users.length}`);
    users.forEach(u => {
      console.log(`- Email: ${u.email} | Role: ${u.role} | Tenant: ${u.tenantId}`);
    });

    console.log('\n--- AUDITORIA DE CLÍNICAS ---');
    const clinicas = await prisma.clinica.findMany({
      select: { tenantId: true, nome: true }
    });
    clinicas.forEach(c => {
      console.log(`- Clínica: ${c.nome} | TenantID: ${c.tenantId}`);
    });

  } catch (e) {
    console.error('ERRO:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
