import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();

    const servicos = await prisma.servico.findMany({
      where: { 
        tenantId,
        ativo: true 
      },
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(servicos);
  } catch (error: any) {
    console.error('Erro ao buscar serviços:', error);
    return NextResponse.json({ error: 'Erro ao buscar serviços', details: error.message, stack: error.stack }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();
    const body = await request.json();
    const { id, nome, descricao, preco, duracaoMinutos, bufferTimeMinutes, color } = body;

    const parsedPreco = parseFloat(String(preco).replace(',', '.')) || 0;
    const parsedDuracao = parseInt(String(duracaoMinutos)) || 30;
    const parsedBuffer = parseInt(String(bufferTimeMinutes)) || 0;

    if (id) {
       const updated = await prisma.servico.update({
          where: { id, tenantId }, // Segurança extra
          data: { 
            nome, 
            descricao, 
            preco: parsedPreco, 
            duracaoMinutos: parsedDuracao, 
            bufferTimeMinutes: parsedBuffer,
            color 
          }
       });
       return NextResponse.json({ servico: updated });
    }

    const novoServico = await prisma.servico.create({
      data: {
        nome,
        descricao,
        preco: parsedPreco,
        duracaoMinutos: parsedDuracao,
        bufferTimeMinutes: parsedBuffer,
        tenantId,
        color: color || '#3B82F6'
      }
    });

    return NextResponse.json({ servico: novoServico });
  } catch (error: any) {
    console.error('Erro ao processar serviço:', error);
    return NextResponse.json({ error: 'Erro ao processar serviço', details: error.message }, { status: 500 });
  }
}
