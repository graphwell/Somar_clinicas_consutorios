import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET /api/convenios/verificar?profissionalId=X&convenioId=Y
// Regra: se profissional NÃO tem nenhum convênio cadastrado → aceita todos
export async function GET(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const profissionalId = searchParams.get('profissionalId');
    const convenioId = searchParams.get('convenioId');

    if (!profissionalId || !convenioId) {
      return NextResponse.json({ error: 'profissionalId e convenioId são obrigatórios.' }, { status: 400 });
    }

    // Buscar todos os convênios ativos do profissional
    const todosConvenios = await prisma.profissionalConvenio.findMany({
      where: { profissionalId, tenantId, ativo: true },
      include: { convenio: { select: { id: true, nomeConvenio: true } } },
    });

    // Se profissional não tem nenhum convênio cadastrado → aceita todos
    if (todosConvenios.length === 0) {
      // Buscar preço se houver tabela
      const tabela = await prisma.convenioTabelaPreco.findFirst({
        where: { convenioId, tenantId, ativo: true },
      });

      return NextResponse.json({
        aceita: true,
        semConfiguracao: true,
        aviso: 'Configure os convênios aceitos em Especialistas → Convênios.',
        preco: tabela?.preco ?? null,
      });
    }

    // Verificar se aceita este convênio específico
    const vinculo = todosConvenios.find((v) => v.convenioId === convenioId);

    if (!vinculo) {
      const convenioNome = await prisma.convenioEmpresa.findUnique({
        where: { id: convenioId },
        select: { nomeConvenio: true },
      });
      const profissionalNome = await prisma.profissional.findUnique({
        where: { id: profissionalId },
        select: { nome: true },
      });

      return NextResponse.json({
        aceita: false,
        mensagem: `${profissionalNome?.nome ?? 'Este profissional'} não atende pelo plano ${convenioNome?.nomeConvenio ?? convenioId}.`,
        conveniosAceitos: todosConvenios.map((v) => ({
          id: v.convenio.id,
          nome: v.convenio.nomeConvenio,
        })),
        aceitaParticular: true,
        sugestao: todosConvenios.length > 0
          ? `Este profissional aceita: ${todosConvenios.map((v) => v.convenio.nomeConvenio).join(', ')}.`
          : 'Este profissional atende apenas particular.',
      });
    }

    // Aceita — buscar preço da tabela se existir
    const tabela = await prisma.convenioTabelaPreco.findFirst({
      where: { convenioId, tenantId, ativo: true },
    });

    return NextResponse.json({
      aceita: true,
      preco: tabela?.preco ?? null,
      codigoTuss: tabela?.codigoTuss ?? null,
    });
  } catch (error: any) {
    console.error('[GET /api/convenios/verificar]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
