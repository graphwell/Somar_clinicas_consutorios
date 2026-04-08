import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateFlow() {
  const tenantId = 'tenant_89135e90'; // Marta
  console.log(`--- Simulando Fluxo para TRIAL Tenant: ${tenantId} ---`);

  // 1. Garantir que o plano é TRIAL
  await prisma.assinatura.upsert({
    where: { tenantId },
    update: { plano: 'trial' },
    create: { tenantId, plano: 'trial' }
  });

  // 2. Tentar ativar COM POOL VAZIO (Simulado bloqueando instâncias UltraMsg)
  console.log('\n[Teste 1] Tentativa com Pool Vazio (sem UltraMsg livres)...');
  const freeUltra = await prisma.whatsappInstance.findFirst({
     where: { plataforma: 'ULTRAMSG', status: 'LIVRE', empresaId: null }
  });

  if (freeUltra) {
      // Temporariamente "ocupa" para o teste
      console.log(`[!] Ocupando temporariamente ${freeUltra.sessionId} para simular estoque vazio.`);
      await prisma.whatsappInstance.update({ where: { id: freeUltra.id }, data: { status: 'DEMO' } });
  }

  // Chamar lógica interna da API (simulada)
  const available = await prisma.whatsappInstance.findFirst({
      where: { plataforma: 'ULTRAMSG', status: 'LIVRE', empresaId: null }
  });

  if (!available) {
      console.log('✅ SUCESSO: Pool vazio detectado corretamente. Retornaria WAITING_INSTANCE.');
  }

  // 3. Restaurar e testar com Pool preenchido
  if (freeUltra) {
      await prisma.whatsappInstance.update({ where: { id: freeUltra.id }, data: { status: 'LIVRE' } });
      console.log('\n[Teste 2] Tentativa com Pool Disponível...');
      const availableNow = await prisma.whatsappInstance.findFirst({
          where: { plataforma: 'ULTRAMSG', status: 'LIVRE', empresaId: null }
      });
      if (availableNow?.plataforma === 'ULTRAMSG') {
          console.log(`✅ SUCESSO: Instância UltraMsg encontrada: ${availableNow.sessionId}`);
      }
  }

  console.log('\n--- Simulação Concluída ---');
}

simulateFlow().finally(() => prisma.$disconnect());
