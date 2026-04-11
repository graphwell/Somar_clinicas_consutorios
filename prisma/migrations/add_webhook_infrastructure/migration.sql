-- Webhook Infrastructure: instance_registry + processed_messages
-- Executar manualmente:
--   psql $DATABASE_URL -f prisma/migrations/add_webhook_infrastructure/migration.sql
--
-- NOTA: tenant_id é TEXT (não UUID) para compatibilidade com clinica.tenantId existente.
-- api_key, instance_token e webhook_secret são armazenados criptografados (AES-256-GCM).

BEGIN;

CREATE TABLE IF NOT EXISTS instance_registry (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  instance_id    TEXT        NOT NULL UNIQUE,
  tenant_id      TEXT        NOT NULL,   -- FK lógica para clinica.tenantId
  provider       TEXT        NOT NULL CHECK (provider IN ('wasender', 'ultramsg')),
  api_key        TEXT        NOT NULL,   -- criptografado: iv:tag:ciphertext
  instance_token TEXT,                   -- criptografado; específico do UltraMsg
  webhook_secret TEXT        NOT NULL,   -- criptografado; valida HMAC
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'inactive', 'error')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instance_registry_instance_id
  ON instance_registry(instance_id);

CREATE INDEX IF NOT EXISTS idx_instance_registry_tenant_id
  ON instance_registry(tenant_id);

-- Deduplicação persistente de mensagens.
-- Limpeza automática recomendada via cron:
--   DELETE FROM processed_messages WHERE processed_at < now() - interval '24 hours';
CREATE TABLE IF NOT EXISTS processed_messages (
  message_id   TEXT        NOT NULL,
  tenant_id    TEXT        NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_processed_at
  ON processed_messages(processed_at);

COMMIT;
