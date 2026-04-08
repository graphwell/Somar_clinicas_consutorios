import { PrismaClient } from '@prisma/client';
import { WhatsAppProvider } from '../src/lib/whatsapp-provider';

const prisma = new PrismaClient();

async function test() {
  const tenantId = 'tenant_89135e90';
  const instance = await prisma.whatsappInstance.findFirst({
    where: { empresaId: tenantId }
  });

  if (!instance) {
    console.log('Instância não encontrada.');
    return;
  }

  console.log('--- Instância Atual ---');
  console.log('ID:', instance.sessionId);
  console.log('Plataforma:', instance.plataforma);
  
  try {
    const qr = await WhatsAppProvider.getQrCode(instance.plataforma, instance.sessionId, instance.bearerToken);
    console.log('--- QR Code Gerado ---');
    console.log(qr);
  } catch (err: any) {
    console.error('--- ERRO AO GERAR QR ---');
    console.error(err.message);
  }
}

test().finally(() => prisma.$disconnect());
