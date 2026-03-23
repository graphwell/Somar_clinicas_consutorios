import crypto from 'crypto';

/**
 * Gera um ID de evento híbrido para evitar duplicidade e garantir idempotência.
 * Formato: hash(pacienteId + dataHora + tenantId)
 */
export function generateEventoId(pacienteId: string, dataHora: Date, tenantId: string, profissionalId?: string | null): string {
  const dataString = dataHora.toISOString();
  // Se tiver profissional, compõe a chave com ele; senão, fica genérico para a clínica
  const rawString = `${pacienteId}-${dataString}-${tenantId}-${profissionalId || 'geral'}`;
  return crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 16);
}
