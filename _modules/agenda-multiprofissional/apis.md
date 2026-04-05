# APIs — agenda-multiprofissional

Todas as rotas exigem Bearer JWT. O middleware injeta `x-tenant-id`.
Profissionais (role=profissional) só veem seus próprios agendamentos.

---

## `GET /api/appointments`
**Autenticação:** Bearer JWT
**Role:** todos (profissional vê apenas os seus)

### Query params
Nenhum obrigatório. Retorna os últimos 100 agendamentos.

### Response 200
```json
[
  {
    "id": "string",
    "dataHora": "DateTime",
    "fimDataHora": "DateTime",
    "durationMinutes": "number",
    "status": "pendente | confirmado | concluido | cancelado",
    "tipoAtendimento": "particular | convenio",
    "convenio": "string | null",
    "categoria": "string | null",
    "observacoes": "string | null",
    "paciente": { "nome": "string", "telefone": "string" },
    "servico": { "id": "string", "nome": "string", "preco": "number", "duracaoMinutos": "number" },
    "profissional": { "id": "string", "nome": "string" }
  }
]
```

### Lógica
1. Lê `x-tenant-id`, `x-user-role`, `x-profissional-id` dos headers
2. Se role=profissional: filtra por `profissionalId`
3. Retorna os últimos 100 agendamentos ordenados por `dataHora desc`

---

## `POST /api/appointments`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao | bot

### Request
```json
{
  "pacienteId": "string",
  "profissionalId": "string? — opcional",
  "servicoId": "string? — opcional",
  "dataHora": "string — ISO 8601",
  "durationMinutes": "number? — padrão 30",
  "status": "string? — padrão pendente",
  "tipoAtendimento": "particular | convenio — padrão particular",
  "convenio": "string? — nome do convênio",
  "observacoes": "string?",
  "categoria": "primeira | consulta | retorno — padrão consulta"
}
```

### Response 200
```json
{
  "id": "string",
  "dataHora": "DateTime",
  "fimDataHora": "DateTime",
  "status": "string",
  "paciente": { "nome": "string" },
  "profissional": { "nome": "string | null" },
  "servico": { "nome": "string | null" }
}
```

### Lógica
1. Validar campos obrigatórios: `pacienteId` e `dataHora`
2. Se `tipoAtendimento=convenio && convenio && profissionalId`:
   a. Buscar convênio por nome no tenant
   b. Buscar convênios do profissional (`ProfissionalConvenio`)
   c. Se profissional tem convênios cadastrados e não inclui este: retornar erro 422
3. Calcular `fimDataHora = dataHora + durationMinutes * 60000`
4. Gerar `eventoId = manual_{timestamp}_{random5}`
5. Criar Agendamento

### Erros
- `400` — pacienteId ou dataHora ausentes
- `422` — convênio não aceito pelo profissional (retorna lista dos aceitos)
- `500` — erro interno

---

## `GET /api/appointments/hoje`
**Autenticação:** Bearer JWT
**Role:** todos

### Response 200
Lista de agendamentos do dia atual (00:00 a 23:59 no fuso local),
incluindo paciente, serviço e profissional.

### Lógica
1. Calcular início e fim do dia atual
2. Buscar agendamentos com `dataHora BETWEEN inicio AND fim`
3. Profissional vê apenas os seus

---

## `GET /api/appointments/semana`
**Autenticação:** Bearer JWT
**Role:** todos

### Query params
- `profissionalId` — filtrar por profissional específico (opcional)
- `inicio` — data de início da semana (ISO, opcional — padrão: domingo atual)

### Response 200
Lista de agendamentos da semana agrupados por dia ou ordenados por `dataHora`.

---

## `GET /api/appointments/agenda`
**Autenticação:** Bearer JWT
**Role:** todos

### Query params
- `profissionalId` — obrigatório para filtrar por profissional
- `data` — data desejada (YYYY-MM-DD)
- `servicoId` — para calcular duração correta do slot

### Response 200
```json
{
  "slots": [
    {
      "hora": "08:00",
      "disponivel": true
    }
  ],
  "horarioTrabalho": {
    "inicio": "08:00",
    "fim": "18:00",
    "almoco": { "inicio": "12:00", "fim": "13:00" }
  }
}
```

### Lógica
1. Buscar `ProfessionalSchedule` para o dia da semana da data solicitada
2. Gerar todos os slots possíveis com intervalo = `duracaoMinutos + bufferTimeMinutes`
3. Buscar agendamentos existentes naquela data para o profissional
4. Marcar slots como indisponíveis se houver sobreposição
5. Excluir horário de almoço dos slots disponíveis
