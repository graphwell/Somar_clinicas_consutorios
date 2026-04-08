
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const email = 'imovimobiliariace@gmail.com';
  
  const user = await prisma.usuario.findUnique({
    where: { email },
    include: {
      clinica: true,
    }
  });

  if (!user) {
    console.log(`Usuário ${email} não encontrado.`);
    return;
  }

  console.log('--- Usuário Encontrado ---');
  console.log(`ID: ${user.id}`);
  console.log(`Nome: ${user.nome}`);
  console.log(`Verificado: ${user.emailVerificado}`);
  console.log(`TenantID: ${user.tenantId}`);
  console.log(`Clínica: ${user.clinica?.nome}`);

  const token = await prisma.emailVerificacao.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' }
  });

  if (token) {
    console.log('\n--- Token de Verificação ---');
    console.log(`Token: ${token.token}`);
    console.log(`Expira em: ${token.expiraEm}`);
    console.log(`Link Manual: https://synka.somar.ia.br/api/auth/verificar-email?token=${token.token}`);
  } else {
    console.log('\nNenhum token encontrado.');
  }
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
