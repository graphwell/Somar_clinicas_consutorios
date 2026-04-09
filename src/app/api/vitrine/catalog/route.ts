import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const nicho = searchParams.get('nicho') || '';
    
    await getAuthorizedTenantId(); // Ensure user is logged in
    const prisma = getTenantPrisma();

    const products = await prisma.masterProduct.findMany({
      where: {
        AND: [
          nicho ? { nicho: { contains: nicho, mode: 'insensitive' } } : {},
          {
            OR: [
              { nome: { contains: search, mode: 'insensitive' } },
              { fabricante: { contains: search, mode: 'insensitive' } },
              { categoria: { contains: search, mode: 'insensitive' } },
            ]
          }
        ]
      },
      orderBy: { nome: 'asc' },
      take: 20
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Erro ao buscar catálogo:', error);
    return NextResponse.json({ error: 'Erro ao buscar catálogo' }, { status: 500 });
  }
}
