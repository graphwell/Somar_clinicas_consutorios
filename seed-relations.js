const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO MAPEAMENTO PROFISSIONAL-SERVIÇO ---');

  const clinicas = await prisma.clinica.findMany({
    include: {
      profissionais: true,
      servicos: true
    }
  });

  for (const clinica of clinicas) {
    console.log(`Processando Clínica: ${clinica.nome} (${clinica.tenantId})`);

    for (const profissional of clinica.profissionais) {
      console.log(`  Mapeando Profissional: ${profissional.nome}`);
      
      // Conectar a todos os serviços da própria clínica como padrão inicial
      await prisma.profissional.update({
        where: { id: profissional.id },
        data: {
          servicos: {
            connect: clinica.servicos.map(s => ({ id: s.id }))
          }
        }
      });
    }
  }

  console.log('✅ Mapeamento concluído com sucesso!');
}

main()
  .catch(e => {
    console.error('ERRO:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
