import { getTenantPrisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

export interface IntegrationData {
  provider: string;
  credentials: Record<string, any>;
  nomeExibicao?: string;
}

export class IntegrationService {
  /**
   * Garantia estrutural de que credenciais brutas criptografadas NUNCA serão retornadas pela API.
   * Utiliza o padrão DTO/Transformer limitando os dados expostos.
   */
  private static toResponse(integration: any) {
    const { encryptedCredentials, ...safeData } = integration;
    return {
      ...safeData,
      // Status boolean extra para o frontend saber que está configurado
      hasCredentials: !!encryptedCredentials 
    };
  }

  static async createIntegration(tenantId: string, data: IntegrationData) {
    const prisma = getTenantPrisma(tenantId);
    const { provider, credentials, nomeExibicao } = data;

    // Criptografa o JSON inteiro das credenciais com AES-256-GCM
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Upsert garante que uma integração inativada possa ser reativada e sobrescrita
    const integration = await prisma.clinicIntegration.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider
        }
      },
      update: {
        encryptedCredentials,
        nomeExibicao,
        isActive: true, // reativa no soft delete
        updatedAt: new Date()
      },
      create: {
        tenantId,
        provider,
        encryptedCredentials,
        nomeExibicao,
        isActive: true
      }
    });

    return this.toResponse(integration);
  }

  static async updateIntegration(tenantId: string, provider: string, credentials: Record<string, any>) {
    const prisma = getTenantPrisma(tenantId);
    
    // Verifica existência
    const existing = await prisma.clinicIntegration.findUnique({
      where: { tenantId_provider: { tenantId, provider } }
    });

    if (!existing) {
      throw new Error('Integração não encontrada para atualização.');
    }

    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    const updated = await prisma.clinicIntegration.update({
      where: { id: existing.id },
      data: { encryptedCredentials, isActive: true, updatedAt: new Date() }
    });

    return this.toResponse(updated);
  }

  static async deactivateIntegration(tenantId: string, provider: string) {
    const prisma = getTenantPrisma(tenantId);
    
    // Soft Delete (isActive = false)
    const deactivated = await prisma.clinicIntegration.update({
      where: { tenantId_provider: { tenantId, provider } },
      data: { isActive: false, updatedAt: new Date() }
    });

    return this.toResponse(deactivated);
  }

  static async getIntegrationsByTenant(tenantId: string) {
    const prisma = getTenantPrisma(tenantId);
    const integrations = await prisma.clinicIntegration.findMany({
      where: { tenantId, isActive: true }
    });

    return integrations.map(this.toResponse);
  }

  // Usado EXCLUSIVAMENTE internamente pelos Gateways
  static async getDecryptedCredentials(tenantId: string, provider: string): Promise<Record<string, any> | null> {
    const prisma = getTenantPrisma(tenantId);
    const config = await prisma.clinicIntegration.findUnique({
      where: { tenantId_provider: { tenantId, provider } }
    });

    if (!config || !config.isActive) return null;

    try {
      const rawJson = decrypt(config.encryptedCredentials);
      return JSON.parse(rawJson);
    } catch (e) {
      console.error(`Erro ao decifrar chave do provedor ${provider}:`, e);
      return null;
    }
  }
}
