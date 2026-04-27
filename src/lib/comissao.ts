import prismaBase from '@/lib/prisma';

export type TipoItemComissao = 'servico' | 'produto';

export interface ResultadoComissao {
  percentual:  number;
  valorFixo:   number | null;
  origem:      'especifico' | 'categoria' | 'padrao_tipo' | 'fallback_global';
  regraId:     string | null;
}

type PrismaLike = typeof prismaBase | Omit<
  typeof prismaBase,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Resolve a regra de comissão para um profissional + tipo de item.
 *
 * Hierarquia (2 níveis):
 *   1. ComissaoRegra tipoBase=tipoItem, referenciaId=null  → 'padrao_tipo'
 *   2. Fallback: Profissional.percentualRepasse             → 'fallback_global'
 *
 * Os parâmetros referenciaId e categoriaRef são mantidos para
 * compatibilidade com chamadores existentes, mas não são usados.
 */
export async function resolverComissao(
  profissionalId: string,
  tipoItem:       TipoItemComissao,
  _referenciaId:  string,
  _categoriaRef:  string | null,
  prisma:         PrismaLike = prismaBase,
): Promise<ResultadoComissao> {
  const p = prisma as typeof prismaBase;

  const padrao = await p.comissaoRegra.findFirst({
    where: {
      profissionalId,
      tipoBase:     tipoItem,
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
