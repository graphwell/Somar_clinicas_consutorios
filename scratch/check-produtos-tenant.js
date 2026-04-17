const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Produtos por tenant
  const produtos = await prisma.produto.groupBy({
    by: ['tenantId'],
    _count: { id: true },
  });
  console.log('Produtos por tenant:', JSON.stringify(produtos, null, 2));

  // Produtos do demo-barbearia
  const barb = await prisma.produto.findMany({
    where: { tenantId: 'demo-barbearia' },
    select: { id: true, nome: true, fabricante: true, imageUrl: true },
  });
  console.log('\nProdutos demo-barbearia:', JSON.stringify(barb, null, 2));

  // Todos os produtos do demo-estetica (para ver o que existe)
  const todos = await prisma.produto.findMany({
    select: { id: true, nome: true, fabricante: true, imageUrl: true, tenantId: true },
    orderBy: { fabricante: 'asc' },
  });
  console.log('\nTodos os produtos (todos tenants):', JSON.stringify(todos, null, 2));

  await prisma.$disconnect();
}
main().catch(console.error);
