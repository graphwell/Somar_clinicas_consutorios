import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const id = 'cmnql3ff60000429r14nei5el';
  const session = 'instance169223';

  console.log(`--- Iniciando limpeza profunda para a instância: ${id} (${session}) ---`);

  try {
    // 1. Verificar se existe
    const inst = await prisma.whatsappInstance.findUnique({ where: { id } });
    if (!inst) {
      console.log('ℹ️ Instância já não existe no banco.');
      return;
    }

    // 2. Limpar referências em WhatsappMigrationLog (campo de string, não relação, mas por precaução)
    const logs = await prisma.whatsappMigrationLog.deleteMany({
      where: {
        OR: [
          { fromSessionId: session },
          { toSessionId: session }
        ]
      }
    });
    console.log(`✅ Logs de migração removidos: ${logs.count}`);

    // 3. Tentar a exclusão real
    await prisma.whatsappInstance.delete({ where: { id } });
    console.log('✅ Instância EXCLUÍDA com sucesso via Prisma!');

  } catch (err: any) {
    console.error('❌ ERRO DURANTE A LIMPEZA:');
    console.error('Código:', err.code);
    console.error('Mensagem:', err.message);
    
    if (err.code === 'P2003') {
      console.error('🔍 Detalhe: Falha de chave estrangeira. Procurando tabelas vinculadas...');
      // Aqui poderíamos fazer uma busca exaustiva por relações, mas o Prisma costuma dar o nome da tabela no erro.
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
