
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for Clinica with slug "barbearia-masterbom-271" or containing "masterbom"...');
  
  const clinicas = await prisma.clinica.findMany({
    where: {
      OR: [
        { slug: 'barbearia-masterbom-271' },
        { slug: { contains: 'masterbom', mode: 'insensitive' } },
        { id: '271' }, 
      ],
    },
  });

  console.log('Results:', JSON.stringify(clinicas, null, 2));

  if (clinicas.length === 0) {
      console.log('No clinic found with slug/id. Searching for any clinic to see slug patterns...');
      const firstFew = await prisma.clinica.findMany({ take: 5 });
      console.log('Slug examples:', firstFew.map(c => ({slug: c.slug, nome: c.nome, tenantId: c.tenantId})));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
