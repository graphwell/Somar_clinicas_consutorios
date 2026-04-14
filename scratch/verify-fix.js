
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const slug = 'barbearia-masterbom-271';
  console.log(`Verifying fix for slug: ${slug}`);

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: {
        id: true,
        tenantId: true,
        nome: true,
        nicho: true,
        descricao: true,
        configBranding: true,
        aceitaPagamento: true,
        openingTime: true,
        closingTime: true,
        workingDays: true,
        profissionais: {
          where: { ativo: true },
          select: {
            id: true,
            nome: true,
            especialidade: true,
            fotoUrl: true,
            color: true,
          },
        },
        servicos: {
          where: { ativo: true },
          select: {
            id: true,
            nome: true,
            duracaoMinutos: true, // Fixed field
            preco: true,
          },
        },
      },
    });

    if (clinica) {
      console.log('SUCCESS: Clinic found and query executed without errors.');
      console.log('Clinic Name:', clinica.nome);
      console.log('Number of services:', clinica.servicos.length);
      console.log('First service:', clinica.servicos[0]);
    } else {
      console.log('FAILED: Clinic not found.');
    }
  } catch (err) {
    console.error('FAILED: Query resulted in error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
