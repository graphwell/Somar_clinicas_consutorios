import { PrismaClient } from '@prisma/client';
import { WhatsAppMigration } from '../src/lib/whatsapp-migration';

const prisma = new PrismaClient();

async function simulate(action: string, tenantId: string) {
  console.log(`Running simulation: ${action} for tenant ${tenantId}...`);

  switch (action) {
    case 'CONNECT': {
      // Simula que o QR Code foi escaneado e a instância conectou
      const instance = await prisma.whatsappInstance.findFirst({
        where: { empresaId: tenantId, status: 'AGUARDANDO' }
      });
      if (!instance) {
        console.error('Nenhuma instância em aguardo encontrada para este tenant.');
        return;
      }
      await prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { 
          status: 'EM_USO', 
          numeroWa: '5585999990000',
          conectadoEm: new Date()
        }
      });
      console.log('✅ Instância marcada como EM_USO (Conectado). O painel deve atualizar em 5s.');
      break;
    }

    case 'PAYMENT': {
      // Simula o Webhook do Stripe (Upgrade para Produção)
      console.log('🔔 Disparando prepareMigration...');
      await WhatsAppMigration.prepareMigration(tenantId);
      console.log('✅ Migração preparada! O painel deve mostrar o banner de upgrade.');
      break;
    }

    default:
      console.log('Ações disponíveis: CONNECT, PAYMENT');
  }
}

const action = process.argv[2];
const tenantId = process.argv[3] || 'tenant_89135e90'; // Default Marta

simulate(action, tenantId)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
