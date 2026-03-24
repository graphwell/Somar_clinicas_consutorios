const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function fix() {
  try {
    const salt = 10;
    const commonHash = await bcrypt.hash('123456', salt);

    console.log('--- RESETANDO admin@clinica.com ---');
    await prisma.usuario.upsert({
      where: { email: 'admin@clinica.com' },
      update: { senhaHash: commonHash, role: 'admin' },
      create: { 
        email: 'admin@clinica.com', 
        senhaHash: commonHash, 
        role: 'admin', 
        tenantId: 'clinica_id_default' 
      }
    });
    console.log('✅ admin@clinica.com resetado para senha: 123456');

    console.log('\n--- CRIANDO synka_admin (MASTER) ---');
    // Nota: synka_admin também precisa estar vinculado a uma clinica pelo Prisma
    // Usaremos a clinica_id_default para este teste
    await prisma.usuario.upsert({
      where: { email: 'master@synka.com' },
      update: { senhaHash: commonHash, role: 'synka_admin' },
      create: { 
        email: 'master@synka.com', 
        senhaHash: commonHash, 
        role: 'synka_admin', 
        tenantId: 'clinica_id_default' 
      }
    });
    console.log('✅ master@synka.com criado com role: synka_admin e senha: 123456');

  } catch (e) {
    console.error('ERRO:', e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
