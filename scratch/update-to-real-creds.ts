import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating pool to use REAL credentials...');

  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.error('ERRO: Credenciais reais (ULTRAMSG_INSTANCE_ID/TOKEN) não encontradas no .env');
    process.exit(1);
  }

  // Atualiza a primeira instância trial para usar os dados reais
  const result = await prisma.whatsappInstance.update({
    where: { sessionId: 'trial-master-01' },
    data: {
      sessionId: instanceId,
      bearerToken: token,
      plataforma: 'ULTRAMSG',
      status: 'LIVRE',
      empresaId: null,
      observacoes: 'Instância TRIAL REAL (UltraMsg)',
    },
  });

  console.log(`✅ Instância '${result.sessionId}' atualizada com sucesso no banco.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
