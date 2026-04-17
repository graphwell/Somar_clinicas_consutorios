const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.produto.findMany({ select: { id: true, nome: true, fabricante: true, imageUrl: true } })
  .then(p => { console.log(JSON.stringify(p, null, 2)); return prisma.$disconnect(); });
