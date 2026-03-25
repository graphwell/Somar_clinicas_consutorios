import { PrismaClient } from '@/generated/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Cliente global unificado. O isolamento é feito via coluna tenantId (Row Level Security ou filtros manuais).
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

/**
 * Retorna o cliente Prisma. 
 * No Synka V2.3, usamos o mesmo cliente para todos os tenants, 
 * filtrando os dados pela coluna tenantId obrigatória em todas as tabelas.
 */
export function getTenantPrisma() {
  return prisma;
}

export function getMasterPrisma() {
  return prisma;
}

export default prisma;
