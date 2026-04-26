import prismaBase from '@/lib/prisma';
import { syncIsSubscriber } from '@/lib/sync-subscriber';
import { removerBlacklist } from '@/lib/blacklist';

/**
 * Confirma o pagamento de uma assinatura recorrente.
 * - Ativa a assinatura (ou reativa se estava inadimplente)
 * - Reseta contadorUso (novo período)
 * - Atualiza proximaCobranca conforme periodicidade
 * - Marca TransacaoFinanceira como paga (se transacaoId fornecido)
 * - Sincroniza isSubscriber + limpa blacklist
 *
 * Toda a operação roda em $transaction — atômica.
 */
export async function confirmarPagamentoAssinatura(
  assinaturaClienteId: string,
  transacaoId: string | undefined,
  tenantId: string,
  prisma: typeof prismaBase,
): Promise<{ ok: boolean; proximoVencimento: Date }> {
  return prisma.$transaction(async (tx) => {
    const assinatura = await tx.assinaturaCliente.findFirst({
      where: { id: assinaturaClienteId, tenantId },
      include: { plano: { select: { periodicidade: true } } },
    });

    if (!assinatura) throw new Error('ASSINATURA_NAO_ENCONTRADA');

    const agora = new Date();
    const proximaCobranca = calcularProximoVencimento(
      agora,
      (assinatura.plano as { periodicidade: string }).periodicidade,
    );

    await tx.assinaturaCliente.update({
      where: { id: assinaturaClienteId },
      data: {
        status:          'ativo',
        proximaCobranca,
        ultimaCobranca:  agora,
        contadorUso:     {},
        ...(assinatura.status === 'inadimplente' ? { dataInicio: agora } : {}),
      },
    });

    if (transacaoId) {
      await tx.transacaoFinanceira.updateMany({
        where: { id: transacaoId, tenantId },
        data: { status: 'paid', dataPagamento: agora },
      });
    }

    await syncIsSubscriber(assinatura.pacienteId, tx as unknown as typeof prismaBase);
    await removerBlacklist(assinatura.pacienteId, tx as unknown as typeof prismaBase);

    console.info(
      `[confirmarPagamento] assinaturaId=${assinaturaClienteId} tenant=${tenantId} próximo=${proximaCobranca.toISOString()}`,
    );

    return { ok: true, proximoVencimento: proximaCobranca };
  });
}

function calcularProximoVencimento(base: Date, periodicidade: string): Date {
  const d = new Date(base);
  switch (periodicidade) {
    case 'anual':       d.setFullYear(d.getFullYear() + 1);  break;
    case 'trimestral':  d.setMonth(d.getMonth() + 3);        break;
    case 'semestral':   d.setMonth(d.getMonth() + 6);        break;
    default:            d.setMonth(d.getMonth() + 1);        break; // mensal
  }
  return d;
}
