import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDelete() {
  const sessionId = 'instance169180'; // Instância existente
  const instancia = await prisma.whatsappInstance.findUnique({
    where: { sessionId }
  });

  if (!instancia) {
    console.log('Instância não encontrada para teste.');
    return;
  }

  console.log(`Tentando excluir instância: ${instancia.id} (${instancia.sessionId})`);
  
  try {
    await prisma.whatsappInstance.delete({
      where: { id: instancia.id }
    });
    console.log('✅ Exclusão bem-sucedida!');
  } catch (err: any) {
    console.error('❌ ERRO NA EXCLUSÃO:', err.message);
    if (err.code === 'P2003') {
      console.error('Causa: Restrição de chave estrangeira (Foreign Key Constraint).');
    }
  }
}

testDelete().finally(() => prisma.$disconnect());
