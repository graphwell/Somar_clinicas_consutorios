# Módulo: whatsapp-marketing

## O que faz
Automação de marketing via WhatsApp: lembretes de agendamento, mensagens de
aniversário, combos de upsell, campanhas em massa e log de todos os envios.
Suporta dois provedores: WaSender API e UltraMsg.

Cada empresa configura sua própria API Key e sessão WhatsApp. Existe também
uma instância demo compartilhada para empresas sem instância própria.

## Casos de uso
- Lembrete automático 24h (ou X horas) antes de um agendamento
- Mensagem de parabéns com desconto para clientes aniversariantes
- Oferta de combo/pacote após determinado serviço
- Campanhas em massa segmentadas (todos, aniversariantes, inativos, por serviço)

## Dependências externas
- **WaSender API** (`WASENDER_BASE_URL`, API Key por empresa) — provedor principal
- **UltraMsg** (instanceId + token) — provedor alternativo
- `WASENDER_DEMO_API_KEY` — instância demo compartilhada (homologação)
- `MARKETING_DEMO_MODE=true` — força uso da demo independente da config da empresa
- `WASENDER_DEMO_PHONE` — número de destino para envios em modo demo

## Variáveis de ambiente
- `WASENDER_BASE_URL`: URL base da API WaSender (padrão: https://wasenderapi.com/api)
- `WASENDER_DEMO_API_KEY`: Bearer token da instância demo
- `WASENDER_DEMO_PHONE`: Número que recebe as mensagens em modo demo
- `MARKETING_DEMO_MODE`: "true" para forçar demo em todos os envios

## Models do banco
- `WhatsappInstance`: instâncias WhatsApp (sessões) vinculadas a empresas
- `MarketingConfig`: configuração de automação por empresa (keys, templates, horários)
- `MarketingCombo`: combos/pacotes com gatilho de serviço e desconto
- `MarketingEnvio`: log de todos os envios (lembrete, aniversário, combo, campanha)
- `MarketingCampanha`: campanhas em massa com segmentação e status de execução
- `CampanhaAviso`: campanhas simplificadas integradas ao painel principal

## API Routes
- `GET/PATCH /api/marketing/config` — buscar e atualizar configuração
- `POST /api/marketing/testar-conexao` — testar se a API Key está funcionando
- `POST /api/marketing/send-lembrete` — enviar lembrete de agendamento manualmente
- `POST /api/marketing/send-aniversario` — enviar mensagem de aniversário
- `POST /api/marketing/send-combo` — enviar oferta de combo para um cliente
- `GET/POST /api/marketing/combos` — listar e criar combos de upsell
- `GET /api/marketing/aniversariantes` — listar clientes aniversariantes do dia/mês
- `GET /api/marketing/agendamentos-pendentes` — listar agendamentos que precisam de lembrete
- `GET /api/marketing/alcance` — estimar alcance de uma campanha
- `GET/POST /api/marketing/campanhas` — listar e criar campanhas
- `POST /api/marketing/campanhas/[id]/dispatch` — disparar uma campanha

## Seleção de instância WhatsApp
Prioridade de qual instância usar no envio:
1. `MARKETING_DEMO_MODE=true` → sempre usa instância demo
2. Empresa tem `wasenderApiKey` própria na `MarketingConfig` → usa a dela
3. Fallback → instância demo compartilhada

## Templates de mensagem
Mensagens usam variáveis `{{nome}}`, `{{data}}`, `{{hora}}`, `{{servico}}`,
`{{profissional}}`, `{{clinica}}`, `{{link}}`. O sistema substitui antes do envio.

## Como adaptar para novo projeto
1. Copiar os models do `schema.prisma` deste módulo
2. Obter credenciais na WaSender API ou UltraMsg
3. Configurar variáveis de ambiente
4. As automações (lembretes automáticos) precisam de um job agendado (n8n ou cron)

## O que NÃO está incluído (customizar)
- Job de envio automático (precisa de n8n, cron ou serverless scheduler)
- Resposta automática a mensagens recebidas (ver módulo n8n-integration)
- Rate limiting por empresa para evitar bloqueio do número
- Templates de mensagem prontos para o seu nicho
