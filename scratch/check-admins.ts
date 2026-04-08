import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmins() {
  console.log('Checking for synka_admin users...');
  
  const users = await prisma.usuario.findMany({
    where: { role: 'synka_admin' },
    select: { email: true, role: true }
  });

  if (users.length === 0) {
    console.log('No synka_admin users found!');
  } else {
    console.log('Synka Admins found:', users);
  }
}

checkAdmins()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
