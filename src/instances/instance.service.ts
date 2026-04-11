import crypto from 'crypto';
import { instanceRepository } from './instance.repository';
import { getProvider } from '../providers/provider.factory';
import { InstanceNotFoundError } from '../webhooks/errors';

const WEBHOOK_URL =
  process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp`
    : 'https://synka.somar.ia.br/api/webhook/whatsapp';

export const instanceService = {
  /**
   * Conecta uma instância no provedor e registra na instance_registry.
   * Retorna o instanceId gerado pelo provedor.
   */
  async connectInstance(params: {
    tenantId:       string;
    provider:       'wasender' | 'ultramsg';
    apiKey:         string;
    instanceToken?: string; // obrigatório para UltraMsg
  }): Promise<string> {
    const prov = getProvider(params.provider);

    // Gera secret aleatório para validar HMAC dos webhooks desta instância
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Registra webhook no provedor — chama API real
    const instanceId = await prov.connectInstance(params.apiKey, WEBHOOK_URL);

    // Persiste no registry
    await instanceRepository.create({
      instanceId,
      tenantId:      params.tenantId,
      provider:      params.provider,
      apiKey:        params.apiKey,
      instanceToken: params.instanceToken ?? null,
      webhookSecret,
    });

    return instanceId;
  },

  /**
   * Desconecta instância do provedor e inativa o registro local.
   * Nunca deleta o registro (auditoria).
   * Sempre chama a API do provedor, mesmo se a atualização local falhar.
   */
  async disconnectInstance(instanceId: string): Promise<void> {
    const record = await instanceRepository.findByInstanceId(instanceId);
    if (!record) throw new InstanceNotFoundError(instanceId);

    const prov = getProvider(record.provider);

    // Desconecta no provedor — mesmo se o update local falhar depois
    try {
      await prov.disconnectInstance(record.apiKey, instanceId);
    } finally {
      // Sempre inativa localmente (never delete)
      await instanceRepository.updateStatus(instanceId, 'inactive');
    }
  },

  async getByInstanceId(instanceId: string) {
    const record = await instanceRepository.findByInstanceId(instanceId);
    if (!record) throw new InstanceNotFoundError(instanceId);
    return record;
  },

  async listByTenant(tenantId: string) {
    return instanceRepository.findByTenantId(tenantId);
  },
};
