import prismaBase from '@/lib/prisma';

type PrismaLike = typeof prismaBase | Omit<
  typeof prismaBase,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface BlacklistStatus {
  bloqueado: boolean;
  liberadoEm: Date | null;
}

/**
 * Verifica se o paciente está temporariamente bloqueado por no-show.
 * blacklistedUntil no passado ou null → não bloqueado.
 */
export async function verificarBlacklist(
  pacienteId: string,
  prisma: PrismaLike = prismaBase,
): Promise<BlacklistStatus> {
  const paciente = await (prisma as typeof prismaBase).paciente.findUnique({
    where:  { id: pacienteId },
    select: { blacklistedUntil: true },
  });

  if (!paciente?.blacklistedUntil) return { bloqueado: false, liberadoEm: null };

  const bloqueado = paciente.blacklistedUntil > new Date();
  return {
    bloqueado,
    liberadoEm: bloqueado ? paciente.blacklistedUntil : null,
  };
}

/**
 * Aplica blacklist ao paciente por N horas (no-show em plano).
 */
export async function aplicarBlacklist(
  pacienteId: string,
  horas: number,
  prisma: PrismaLike = prismaBase,
): Promise<void> {
  const liberadoEm = new Date();
  liberadoEm.setHours(liberadoEm.getHours() + horas);
  await (prisma as typeof prismaBase).paciente.update({
    where: { id: pacienteId },
    data:  { blacklistedUntil: liberadoEm },
  });
  console.info(`[blacklist] pacienteId=${pacienteId} bloqueado por ${horas}h até ${liberadoEm.toISOString()}`);
}

/**
 * Remove a blacklist ao concluir um atendimento.
 */
export async function removerBlacklist(
  pacienteId: string,
  prisma: PrismaLike = prismaBase,
): Promise<void> {
  await (prisma as typeof prismaBase).paciente.update({
    where: { id: pacienteId },
    data:  { blacklistedUntil: null },
  });
}
