import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();
    const body = await request.json();
    const { masterProductId, preco, estoque } = body;

    if (!masterProductId) {
      return NextResponse.json({ error: 'ID do produto mestre é obrigatório' }, { status: 400 });
    }

    const masterProduct = await prisma.masterProduct.findUnique({
      where: { id: masterProductId }
    });

    if (!masterProduct) {
      return NextResponse.json({ error: 'Produto mestre não encontrado' }, { status: 404 });
    }

    // 1. Lidar com a Categoria
    let categoriaId: string | null = null;
    if (masterProduct.categoria) {
      const existingCategory = await prisma.categoriaProduto.findFirst({
        where: { tenantId, nome: { equals: masterProduct.categoria, mode: 'insensitive' } }
      });

      if (existingCategory) {
        categoriaId = existingCategory.id;
      } else {
        const newCategory = await prisma.categoriaProduto.create({
          data: { tenantId, nome: masterProduct.categoria }
        });
        categoriaId = newCategory.id;
      }
    }

    // 2. Criar o Produto na clínica
    const produtoAtivado = await prisma.produto.create({
      data: {
        tenantId,
        categoriaId,
        nome: masterProduct.nome,
        fabricante: masterProduct.fabricante,
        descricao: masterProduct.descricao,
        dicaDeUso: masterProduct.dicaUso,
        posicionamento: masterProduct.posicionamento,
        preco: parseFloat(preco) || 0,
        estoque: parseInt(estoque) || 0,
        tags: masterProduct.tags,
        imageUrl: masterProduct.imageUrl,
        status: 'active'
      }
    });

    return NextResponse.json({ success: true, product: produtoAtivado });
  } catch (error) {
    console.error('Erro ao ativar produto do catálogo:', error);
    return NextResponse.json({ error: 'Erro ao ativar produto' }, { status: 500 });
  }
}
