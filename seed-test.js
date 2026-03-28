const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'clinica_id_default';
  const slug = 'clinica-default';
  
  const clinica = await prisma.clinica.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      slug,
      nome: 'Clínica Somar Teste',
      nicho: 'CLINICA_MEDICA',
      botActive: true,
      configBranding: {
        logoUrl: 'https://somar.ia.br/logo.png',
        primaryColor: '#3b82f6',
        instanceId: 'instance156799',
        ultraMsgToken: 'nbk60ugo4t1craq9'
      }
    }
  });

  console.log('Clínica de teste criada/verificada:', clinica);

  // Criar usuário Admin para teste se não existir
  const adminEmail = 'admin@clinica.com';
  const bcrypt = require('bcryptjs');
  const senhaHash = await bcrypt.hash('123456', 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      senhaHash,
      role: 'admin',
      tenantId: clinica.tenantId
    }
  });

  console.log('Usuário admin de teste criado/verificado:', usuario);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
