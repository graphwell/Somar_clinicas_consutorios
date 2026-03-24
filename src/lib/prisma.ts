import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
  var tenantClients: Map<string, PrismaClient> | undefined;
}

// O Prisma Master é usado para tabelas compartilhadas (Clinica, Usuario, etc.)
const prisma = globalThis.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

const tenantClients = globalThis.tenantClients ?? new Map<string, PrismaClient>();
if (process.env.NODE_ENV !== 'production') globalThis.tenantClients = tenantClients;

/**
 * Retorna o cliente Prisma isolado para o tenant específico.
 * Regra: Cada empresa possui seu próprio banco/schema de dados isolado.
 */
export function getTenantPrisma(tenantId: string) {
  if (tenantClients.has(tenantId)) {
    return tenantClients.get(tenantId)!;
  }

  // No Synka V2.3, o isolamento físico pode ser feito via esquemas ou bancos separados.
  // Padronizamos o isolamento de esquema (PostgreSQL) para escalabilidade com pooling.
  const baseUrl = process.env.DATABASE_URL!;
  const tenantUrl = baseUrl.includes('?') 
    ? baseUrl.split('?')[0] + `?schema=${tenantId}`
    : `${baseUrl}?schema=${tenantId}`;

  const client = new PrismaClient({
    datasources: {
      db: { url: tenantUrl },
    },
  });

  tenantClients.set(tenantId, client);
  return client;
}

export function getMasterPrisma() {
  return prisma;
}

export default prisma;
