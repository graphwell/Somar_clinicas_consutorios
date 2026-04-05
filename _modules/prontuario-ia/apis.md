# APIs — prontuario-ia

Todas as rotas exigem Bearer JWT. O middleware injeta `x-tenant-id`.

---

## `GET /api/prontuario/[pacienteId]`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao | profissional

### Response 200
Lista de evoluções do paciente com medidas, CIDs e arquivos.

### Lógica
1. Verificar que o paciente pertence ao tenant
2. Buscar `ProntuarioRegistro` com includes de medidas, odontograma, arquivos e CIDs
3. Profissional vê apenas seus próprios registros (filtrar por `profissionalId`)

---

## `POST /api/prontuario`
**Autenticação:** Bearer JWT
**Role:** admin | profissional

### Request
```json
{
  "pacienteId": "string",
  "profissionalId": "string?",
  "tipo": "CLINICO | ODONTOLOGICO | NUTRICIONAL | ESTETICO",
  "agendamentoId": "string?",
  "queixaPrincipal": "string?",
  "evolucao": "string?",
  "historiaMolestia": "string?",
  "hipoteseDiagnostica": "string?",
  "conduta": "string?",
  "cidCodigo": "string?",
  "cidDescricao": "string?",
  "pressaoSistolica": "number?",
  "pressaoDiastolica": "number?",
  "temperatura": "number?",
  "saturacao": "number?",
  "soapSubjetivo": "string?",
  "soapObjetivo": "string?",
  "soapAvaliacao": "string?",
  "soapPlano": "string?",
  "retornoEm": "string? — ISO"
}
```

### Response 201
Registro criado.

---

## `PUT /api/prontuario/[pacienteId]/evolucoes/[id]`
**Autenticação:** Bearer JWT
**Role:** admin | profissional

### Lógica
1. Verificar que o registro pertence ao tenant e ao paciente
2. Se `assinadoEm` preenchido: BLOQUEAR edição (apenas adendos permitidos)
3. Atualizar campos fornecidos

### Erros
- `403` — prontuário já assinado (não pode editar)
- `404` — registro não encontrado

---

## `POST /api/prontuario/assinar`
**Autenticação:** Bearer JWT
**Role:** profissional | admin

### Request
```json
{
  "prontuarioId": "string"
}
```

### Response 200
```json
{
  "assinadoPor": "string",
  "assinadoEm": "DateTime",
  "assinaturaHash": "string — SHA-256"
}
```

### Lógica
1. Buscar prontuário e verificar que pertence ao tenant
2. Verificar que ainda não foi assinado
3. Gerar hash SHA-256 do conteúdo clínico principal
4. Salvar `assinadoPor`, `assinadoEm`, `assinaturaHash`

---

## `POST /api/prontuario/adendo`
**Autenticação:** Bearer JWT
**Role:** profissional | admin

### Request
```json
{
  "prontuarioId": "string",
  "texto": "string — conteúdo do adendo"
}
```

### Response 200
Prontuário atualizado com o adendo appended ao campo `evolucao`.

### Lógica
1. Verificar que o prontuário está assinado (adendo só existe para assinados)
2. Adicionar texto ao final do campo `evolucao` com data e hora do adendo

---

## `GET /api/prontuario/[pacienteId]/alergias`
**Autenticação:** Bearer JWT
**Role:** todos

### Response 200
Lista de alergias do paciente.

---

## `POST /api/prontuario/[pacienteId]/alergias`
**Autenticação:** Bearer JWT
**Role:** admin | profissional

### Request
```json
{
  "descricao": "string",
  "gravidade": "LEVE | MODERADA | GRAVE — padrão MODERADA"
}
```

---

## `DELETE /api/prontuario/[pacienteId]/alergias/[id]`
**Autenticação:** Bearer JWT
**Role:** admin | profissional

Deleta alergia verificando que pertence ao tenant.

---

## `GET/POST /api/prontuario/[pacienteId]/medicamentos`
**Autenticação:** Bearer JWT
**Role:** todos (GET) / admin ou profissional (POST)

Similar ao endpoint de alergias.

---

## `GET /api/prontuario/[pacienteId]/metricas`
**Autenticação:** Bearer JWT
**Role:** todos

### Response 200
Histórico de medidas corporais agrupadas por data para exibir evolução.

---

## `GET/POST /api/prontuario/templates`
**Autenticação:** Bearer JWT
**Role:** todos (GET) / admin ou profissional (POST)

Listar e criar templates de campos.

---

## `POST /api/prontuario/ia/rascunho`
**Autenticação:** Bearer JWT
**Role:** admin | profissional

### Request
```json
{
  "texto": "string — texto livre ditado pelo profissional",
  "tipo": "CLINICO | ODONTOLOGICO | NUTRICIONAL",
  "pacienteId": "string? — para contexto de alergias e histórico"
}
```

### Response 200
```json
{
  "rascunho": {
    "queixaPrincipal": "string",
    "evolucao": "string",
    "hipoteseDiagnostica": "string",
    "conduta": "string",
    "cidSugerido": { "codigo": "string", "descricao": "string" }
  }
}
```

### Lógica
1. Opcionalmente buscar contexto do paciente (alergias, histórico)
2. Montar prompt para o LLM com o texto e tipo de prontuário
3. Chamar API do Gemini/LLM
4. Estruturar resposta em JSON

---

## `POST /api/prontuario/ia/transcricao`
**Autenticação:** Bearer JWT
**Role:** admin | profissional

### Request
FormData com campo `audio` (arquivo de áudio MP3/WAV/OGG).

### Response 200
```json
{
  "texto": "string — transcrição do áudio"
}
```

---

## `POST /api/prontuario/ia/cid-search`
**Autenticação:** Bearer JWT
**Role:** admin | profissional

### Request
```json
{
  "texto": "string — hipótese diagnóstica ou sintomas"
}
```

### Response 200
```json
{
  "cids": [
    { "codigo": "string", "descricao": "string", "relevancia": "number" }
  ]
}
```

---

## `POST /api/prontuario/ia/ler-documento`
**Autenticação:** Bearer JWT
**Role:** admin | profissional

### Request
FormData com campo `arquivo` (PDF ou imagem).

### Response 200
```json
{
  "resumo": "string",
  "textoExtraido": "string"
}
```
