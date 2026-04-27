import prismaBase from '@/lib/prisma';

export type TipoItemComissao = 'servico' | 'produto';

export interface ResultadoComissao {
  percentual:  number;           // 0–100
  valorFixo:   number | null;    // R$ fixo por unidade (null = usar percentual)
  origem:      'especifico' | 'categoria' | 'padrao_tipo' | 'fallback_global';
  regraId:     string | null;
}

type PrismaLike = typeof prismaBase | Omit<
  typeof prismaBase,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Resolve a regra de comissão para um profissional + item (serviço ou produto).
 *
 * Hierarquia (maior prioridade primeiro):
 *   1. regra específica por servicoId / produtoId   → origem: 'especifico'
 *   2. regra por categoria (string ou id)            → origem: 'categoria'
 *   3. regra padrão do tipo (servico | produto)      → origem: 'padrao_tipo'
 *   4. fallback: Profissional.percentualRepasse       → origem: 'fallback_global'
 */
export async function resolverComissao(
  profissionalId: string,
  tipoItem:       TipoItemComissao,
  referenciaId:   string,         // servicoId ou produtoId
  categoriaRef:   string | null,  // categoria string ou categoriaProdutoId
  prisma:         PrismaLike = prismaBase,
): Promise<ResultadoComissao> {
  const p = prisma as typeof prismaBase;

  // 1. Regra específica por item
  const especifica = await p.comissaoRegra.findFirst({
    where: {
      profissionalId,
      tipoBase:    `${tipoItem}_especifico`,
      referenciaId,
      ativo:       true,
    },
  });
  if (especifica) {
    return {
      percentual: especifica.percentual ?? 0,
      valorFixo:  especifica.valorFixo ?? null,
      origem:     'especifico',
      regraId:    especifica.id,
    };
  }

  // 2. Regra por categoria
  if (categoriaRef) {
    const porCategoria = await p.comissaoRegra.findFirst({
      where: {
        profissionalId,
        tipoBase:    `${tipoItem}_categoria`,
        referenciaId: categoriaRef,
        ativo:        true,
      },
    });
    if (porCategoria) {
      return {
        percentual: porCategoria.percentual ?? 0,
        valorFixo:  porCategoria.valorFixo ?? null,
        origem:     'categoria',
        regraId:    porCategoria.id,
      };
    }
  }

  // 3. Regra padrão do tipo
  const padrao = await p.comissaoRegra.findFirst({
    where: {
      profissionalId,
      tipoBase:    tipoItem,
      referenciaId: null,
      ativo:        true,
    },
  });
  if (padrao) {
    return {
      percentual: padrao.percentual ?? 0,
      valorFixo:  padrao.valorFixo ?? null,
      origem:     'padrao_tipo',
      regraId:    padrao.id,
    };
  }

  // 4. Fallback global: Profissional.percentualRepasse
  const prof = await p.profissional.findUnique({
    where:  { id: profissionalId },
    select: { percentualRepasse: true },
  });

  return {
    percentual: prof?.percentualRepasse ?? 0,
    valorFixo:  null,
    origem:     'fallback_global',
    regraId:    null,
  };
}

/**
 * Calcula o valor da comissão dado o valor base e a regra resolvida.
 * Arredonda para 2 casas decimais.
 */
export function calcularValorComissao(
  valorBase: number,
  regra:     ResultadoComissao,
): number {
  if (regra.valorFixo !== null) {
    return Math.round(regra.valorFixo * 100) / 100;
  }
  return Math.round((valorBase * regra.percentual) / 100 * 100) / 100;
}
