import crypto from 'crypto';

/**
 * Gera um ID de evento híbrido para evitar duplicidade e garantir idempotência.
 * Formato: hash(pacienteId + dataHora + tenantId)
 */
export function generateEventoId(pacienteId: string, dataHora: Date, tenantId: string): string {
  const dataString = dataHora.toISOString();
  const rawString = `${pacienteId}-${dataString}-${tenantId}`;
  return crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 16);
}
