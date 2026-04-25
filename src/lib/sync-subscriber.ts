import prismaBase from '@/lib/prisma';

// Aceita tanto o cliente completo quanto um cliente de transação Prisma
type PrismaLike = typeof prismaBase | Omit<
  typeof prismaBase,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Sincroniza o campo isSubscriber do Paciente com a existência de uma
 * AssinaturaCliente ativa. Deve ser chamado sempre que uma assinatura for
 * criada, cancelada ou expirada para manter o campo em sync.
 */
export async function syncIsSubscriber(
  pacienteId: string,
  prisma: PrismaLike = prismaBase,
): Promise<void> {
  const ativa = await (prisma as typeof prismaBase).assinaturaCliente.findFirst({
    where: { pacienteId, status: 'ativo' },
    select: { id: true },
  });

  await (prisma as typeof prismaBase).paciente.update({
    where: { id: pacienteId },
    data: { isSubscriber: !!ativa },
  });
}
