# APIs — whatsapp-marketing

Todas as rotas exigem Bearer JWT. O middleware injeta `x-tenant-id`.

---

## `GET /api/marketing/config`
**Autenticação:** Bearer JWT
**Role:** todos

### Response 200
```json
{
  "config": {
    "tenantId": "string",
    "wasenderApiKey": "••••••••XXXX",
    "_temApiKey": "boolean",
    "_instanciaStatus": "instancia | propria | demo | nenhuma",
    "_forceDemo": "boolean",
    "_temDemo": "boolean",
    "_demoPhone": "string | null",
    "lembreteAtivo": "boolean",
    "lembreteAntecedenciaHoras": "number",
    "lembreteHorario": "string",
    "lembreteTemplate": "string | null",
    "aniversarioAtivo": "boolean",
    "aniversarioHorario": "string",
    "aniversarioDescontoPct": "number",
    "aniversarioTemplate": "string | null",
    "linkConfirmacao": "string | null",
    "nomeEmpresa": "string | null"
  },
  "instance": {
    "id": "string",
    "sessionId": "string",
    "numeroWa": "string | null",
    "status": "LIVRE | EM_USO | DEMO | OFFLINE | AGUARDANDO",
    "plataforma": "WASENDERAPI | ULTRAMSG"
  }
}
```

### Lógica
1. Busca (ou cria com upsert) `MarketingConfig` para o tenant
2. Busca a WhatsappInstance vinculada ao tenant
3. Determina `_instanciaStatus` com base em: instância vinculada > API key própria > demo
4. Mascara a API Key — retorna apenas os últimos 4 caracteres

### Erros
- `401` — sem autenticação
- `500` — erro interno

---

## `PATCH /api/marketing/config`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
```json
{
  "wasenderApiKey": "string? — nova API key (não mascarada)",
  "wasenderSessionId": "string?",
  "lembreteAtivo": "boolean?",
  "lembreteAntecedenciaHoras": "number?",
  "lembreteHorario": "string? — formato HH:MM",
  "lembreteTemplate": "string?",
  "aniversarioAtivo": "boolean?",
  "aniversarioHorario": "string?",
  "aniversarioDescontoPct": "number?",
  "aniversarioTemplate": "string?",
  "linkConfirmacao": "string?",
  "nomeEmpresa": "string?"
}
```

### Response 200
```json
{ "success": true, "config": { "...campos sem a API key" } }
```

### Lógica
1. Se `wasenderApiKey` não contém `•` (não é mascarada), tenta validar chamando a API WaSender
2. Filtra apenas campos permitidos (whitelist)
3. Ignora campos mascarados (que contenham `•`)
4. Faz upsert na `MarketingConfig`

---

## `POST /api/marketing/send-lembrete`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Request
```json
{
  "agendamentoId": "string"
}
```

### Response 200
```json
{
  "success": true,
  "wasenderMsgId": "string | null"
}
```

### Lógica
1. Busca agendamento com include de paciente, serviço e profissional
2. Busca `MarketingConfig` e `Clinica` do tenant
3. Monta mensagem substituindo variáveis no template:
   - `{{nome}}` — primeiro nome do paciente
   - `{{data}}` — data do agendamento em pt-BR
   - `{{hora}}` — hora do agendamento
   - `{{servico}}` — nome do serviço (ou "Consulta")
   - `{{profissional_linha}}` — " com NomeProfissional" se houver
   - `{{clinica}}` — nome da empresa
   - `{{link}}` — link de confirmação
4. Envia via `sendAndLog` (persiste em `MarketingEnvio`)

### Erros
- `400` — agendamentoId não informado
- `404` — agendamento não encontrado
- `422` — paciente sem telefone

---

## `POST /api/marketing/send-aniversario`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Request
```json
{
  "pacienteId": "string"
}
```

### Response 200
```json
{ "success": true }
```

### Lógica
1. Busca paciente, verifica se tem telefone
2. Monta mensagem usando `aniversarioTemplate` com desconto
3. Envia e registra em `MarketingEnvio` com tipo "aniversario"

---

## `POST /api/marketing/send-combo`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Request
```json
{
  "pacienteId": "string",
  "comboId": "string"
}
```

### Response 200
```json
{ "success": true }
```

### Lógica
1. Busca paciente e combo
2. Monta mensagem com `templateWhatsapp` do combo
3. Envia e registra com tipo "combo" e `comboId`

---

## `GET /api/marketing/combos`
**Autenticação:** Bearer JWT
**Role:** todos

### Response 200
```json
[
  {
    "id": "string",
    "nome": "string",
    "descricao": "string | null",
    "servicos": ["string"],
    "precoCombo": "number",
    "descontoPct": "number | null",
    "ativo": "boolean",
    "validadeDias": "number"
  }
]
```

---

## `POST /api/marketing/combos`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
```json
{
  "nome": "string",
  "descricao": "string?",
  "servicos": ["string — IDs dos serviços"],
  "gatilhoServico": "string? — ID do serviço gatilho",
  "precoOriginal": "number?",
  "precoCombo": "number",
  "descontoPct": "number?",
  "validadeDias": "number? — padrão 30",
  "templateWhatsapp": "string?"
}
```

### Response 201
```json
{ "id": "string", "...campos do combo criado" }
```

---

## `GET /api/marketing/aniversariantes`
**Autenticação:** Bearer JWT
**Role:** todos

### Query params
- `mes` — mês (1-12), padrão: mês atual

### Response 200
```json
[
  {
    "id": "string",
    "nome": "string",
    "telefone": "string",
    "dataNascimento": "DateTime"
  }
]
```

### Lógica
Busca pacientes do tenant cujo mês de nascimento corresponde ao filtro.

---

## `GET /api/marketing/agendamentos-pendentes`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Response 200
```json
[
  {
    "id": "string",
    "dataHora": "DateTime",
    "paciente": { "nome": "string", "telefone": "string" },
    "servico": { "nome": "string" },
    "profissional": { "nome": "string | null" }
  }
]
```

### Lógica
Retorna agendamentos futuros com status "pendente" ou "confirmado" que ainda
não receberam lembrete nas próximas X horas (conforme config).

---

## `GET /api/marketing/metrics`
**Autenticação:** Bearer JWT
**Role:** admin

### Response 200
```json
{
  "totalEnvios": "number",
  "enviosHoje": "number",
  "taxaSucesso": "number — percentual",
  "porTipo": {
    "lembrete": "number",
    "aniversario": "number",
    "combo": "number",
    "campanha": "number"
  }
}
```

---

## `GET /api/marketing/campanhas`
**Autenticação:** Bearer JWT
**Role:** admin

### Response 200
Lista de `MarketingCampanha` do tenant ordenadas por `criadoEm` desc.

---

## `POST /api/marketing/campanhas`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
```json
{
  "nome": "string",
  "tipo": "todos | aniversariantes | inativos | servico",
  "template": "string — mensagem com variáveis {{nome}}, etc.",
  "filtroServico": "string? — ID do serviço (para tipo=servico)",
  "filtroInativoDias": "number? — para tipo=inativos",
  "agendadoPara": "DateTime? — para agendar envio"
}
```

### Response 201
```json
{ "id": "string", "...campos da campanha criada" }
```

---

## `POST /api/marketing/campanhas/[id]/dispatch`
**Autenticação:** Bearer JWT
**Role:** admin

### Response 200
```json
{
  "totalEnviados": "number",
  "totalErros": "number",
  "status": "concluida | enviando"
}
```

### Lógica
1. Busca a campanha e verifica status = "rascunho"
2. Determina lista de destinatários conforme o tipo
3. Envia mensagem para cada destinatário via WhatsApp
4. Registra cada envio em `MarketingEnvio`
5. Atualiza contadores na campanha

---

## `GET /api/marketing/alcance`
**Autenticação:** Bearer JWT
**Role:** admin

### Query params
- `tipo` — todos | aniversariantes | inativos | servico
- `filtroServico` — ID do serviço (opcional)
- `filtroInativoDias` — dias sem vir (opcional)

### Response 200
```json
{
  "total": "number — quantidade de clientes que receberão a mensagem"
}
```
