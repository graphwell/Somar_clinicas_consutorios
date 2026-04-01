import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET — tabela de preços do convênio + serviços sem preço definido
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id: convenioId } = params;

    // Todos os serviços da clínica
    const [servicos, tabela] = await Promise.all([
      prisma.servico.findMany({
        where: { tenantId, ativo: true },
        orderBy: { nome: 'asc' },
      }),
      prisma.convenioTabelaPreco.findMany({
        where: { convenioId, tenantId },
      }),
    ]);

    const tabelaMap = Object.fromEntries(tabela.map((t) => [t.servicoId, t]));

    const result = servicos.map((s) => {
      const entrada = tabelaMap[s.id];
      return {
        servicoId: s.id,
        servicoNome: s.nome,
        precoParticular: s.preco,
        precoConvenio: entrada?.preco ?? null,
        codigoTuss: entrada?.codigoTuss ?? null,
        tabelaId: entrada?.id ?? null,
        ativo: entrada?.ativo ?? false,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — definir/atualizar preço de serviço no convênio
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id: convenioId } = params;
    const { servicoId, preco, codigoTuss } = await req.json();

    if (!servicoId || preco == null) {
      return NextResponse.json({ error: 'servicoId e preco são obrigatórios.' }, { status: 400 });
    }

    const entrada = await prisma.convenioTabelaPreco.upsert({
      where: { convenioId_servicoId: { convenioId, servicoId } },
      update: { preco: Number(preco), codigoTuss: codigoTuss || null, ativo: true, tenantId },
      create: {
        convenioId,
        servicoId,
        tenantId,
        preco: Number(preco),
        codigoTuss: codigoTuss || null,
        ativo: true,
      },
    });

    return NextResponse.json(entrada);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
