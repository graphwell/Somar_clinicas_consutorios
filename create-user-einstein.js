const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function fix() {
  try {
    const salt = 10;
    const commonHash = await bcrypt.hash('123456', salt);
    const email = 'einsteinalbuquerque@hotmail.com';
    const tenantId = 'tenant_einstein_demo';

    console.log(`--- CRIANDO USUÁRIO: ${email} ---`);
    
    // Criar Clínica primeiro
    await prisma.clinica.upsert({
      where: { tenantId },
      update: { nome: 'Clínica Einstein' },
      create: { 
        tenantId, 
        nome: 'Clínica Einstein',
        slug: 'clinica-einstein',
        onboardingCompleted: false
      }
    });

    await prisma.usuario.upsert({
      where: { email },
      update: { senhaHash: commonHash, role: 'admin' },
      create: { 
        email, 
        senhaHash: commonHash, 
        role: 'admin', 
        tenantId
      }
    });
    console.log('✅ Usuário e Clínica criados com sucesso!');

  } catch (e) {
    console.error('ERRO:', e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
