import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Linha raw retornada pelo PostgreSQL (snake_case). */
type InstanceRow = {
  id:             string;
  instance_id:    string;
  tenant_id:      string;
  provider:       string;
  api_key:        string;        // criptografado em repouso
  instance_token: string | null; // criptografado em repouso
  webhook_secret: string;        // criptografado em repouso
  status:         string;
  created_at:     Date;
  updated_at:     Date;
};

/** Registro decriptado exposto para o restante do sistema. */
export interface InstanceRecord {
  id:            string;
  instanceId:    string;
  tenantId:      string;
  provider:      string;
  apiKey:        string;        // plaintext (nunca logar)
  instanceToken: string | null; // plaintext (nunca logar)
  webhookSecret: string;        // plaintext (nunca logar)
  status:        string;
}

export interface CreateInstanceInput {
  instanceId:    string;
  tenantId:      string;
  provider:      string;
  apiKey:        string;
  instanceToken?: string | null;
  webhookSecret: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function toRecord(row: InstanceRow): InstanceRecord {
  return {
    id:            row.id,
    instanceId:    row.instance_id,
    tenantId:      row.tenant_id,
    provider:      row.provider,
    apiKey:        decrypt(row.api_key),
    instanceToken: row.instance_token ? decrypt(row.instance_token) : null,
    webhookSecret: decrypt(row.webhook_secret),
    status:        row.status,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export const instanceRepository = {
  async findByInstanceId(instanceId: string): Promise<InstanceRecord | null> {
    const rows = await prisma.$queryRaw<InstanceRow[]>`
      SELECT * FROM instance_registry
      WHERE instance_id = ${instanceId}
      LIMIT 1
    `;
    return rows.length > 0 ? toRecord(rows[0]) : null;
  },

  async findByTenantId(tenantId: string): Promise<InstanceRecord[]> {
    const rows = await prisma.$queryRaw<InstanceRow[]>`
      SELECT * FROM instance_registry
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;
    return rows.map(toRecord);
  },

  async create(input: CreateInstanceInput): Promise<InstanceRecord> {
    const rows = await prisma.$queryRaw<InstanceRow[]>`
      INSERT INTO instance_registry
        (instance_id, tenant_id, provider, api_key, instance_token, webhook_secret, status)
      VALUES (
        ${input.instanceId},
        ${input.tenantId},
        ${input.provider},
        ${encrypt(input.apiKey)},
        ${input.instanceToken ? encrypt(input.instanceToken) : null},
        ${encrypt(input.webhookSecret)},
        'active'
      )
      RETURNING *
    `;
    return toRecord(rows[0]);
  },

  async updateStatus(instanceId: string, status: 'active' | 'inactive' | 'error'): Promise<void> {
    await prisma.$executeRaw`
      UPDATE instance_registry
      SET    status     = ${status},
             updated_at = now()
      WHERE  instance_id = ${instanceId}
    `;
  },
};
