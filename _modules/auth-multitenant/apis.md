# APIs — auth-multitenant

Todas as rotas de autenticação são **públicas** (não exigem token).
O middleware as libera via prefixo `/api/auth/`.

---

## `POST /api/auth/register`
**Autenticação:** Nenhuma (rota pública)

### Request
```json
{
  "email": "string — e-mail do responsável",
  "senha": "string — mínimo 8 chars, 1 maiúscula, 1 número",
  "nomeEmpresa": "string — nome da empresa/conta (mínimo 2 chars)",
  "nome": "string — nome do responsável (mínimo 2 chars)",
  "sobrenome": "string? — sobrenome (opcional)",
  "telefone": "string? — formato (XX) XXXXX-XXXX (opcional)"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Conta criada! Verifique seu email para ativar o acesso.",
  "email": "string"
}
```

### Lógica
1. Valida campos obrigatórios (nome, email, senha, nomeEmpresa)
2. Valida força da senha (8+ chars, maiúscula, número)
3. Verifica se e-mail já está cadastrado
4. Em transação atômica: cria `Empresa` (com `tenantId` gerado) + `Usuario` (role=admin)
5. Gera token UUID de verificação (expira em 24h) e persiste em `EmailVerificacao`
6. Dispara e-mail de verificação via Resend (assíncrono, não bloqueia resposta)

### Erros
- `400` — campos obrigatórios faltando, senha fraca, e-mail inválido, nome curto
- `400` — e-mail já cadastrado
- `500` — erro interno

---

## `POST /api/auth/login`
**Autenticação:** Nenhuma (rota pública)

### Request
```json
{
  "email": "string",
  "senha": "string"
}
```

### Response 200
```json
{
  "token": "string — JWT HS256 (7 dias)",
  "user": {
    "id": "string",
    "nome": "string",
    "email": "string",
    "role": "string",
    "tenantId": "string",
    "profissionalId": "string | null",
    "avatarUrl": "string | null",
    "empresa": "string — nome da empresa",
    "slug": "string",
    "onboardingCompleted": "boolean"
  }
}
```

### Lógica
1. Busca usuário por e-mail com join na empresa
2. Compara senha com `bcryptjs.compare`
3. Verifica se acesso temporário (`acessoExpiraEm`) não expirou
4. Gera JWT com `{ userId, email, role, tenantId, profissionalId }` via `jose`

### Erros
- `400` — campos obrigatórios faltando
- `401` — credenciais inválidas (e-mail não encontrado ou senha errada)
- `403` — acesso temporário expirado (`code: "ACESSO_EXPIRADO"`)
- `500` — erro interno

---

## `GET /api/auth/me`
**Autenticação:** Bearer JWT (lido diretamente do header — não passa pelo middleware)
**Nota:** Esta rota lê o token manualmente para poder criar a assinatura trial se ela não existir.

### Response 200
```json
{
  "user": {
    "id": "string",
    "role": "string",
    "tenantId": "string"
  },
  "planStatus": "trial | active | expired | past_due | canceling",
  "plano": "string — id do plano (trial, solo, pro, business)",
  "trialFim": "DateTime | null",
  "diasRestantesTrial": "number | null",
  "permissaoAcesso": "boolean — true se trial ou active"
}
```

### Lógica
1. Extrai e verifica JWT do header `Authorization`
2. Busca usuário no banco para obter role atualizada
3. Busca ou cria `Assinatura` (cria trial automático se não existir)
4. Se status=trial e `trialFim` passou: atualiza para `expired`
5. Calcula `diasRestantesTrial` se ainda em trial

### Erros
- `401` — sem token ou token inválido
- `403` — usuário não encontrado no banco
- `500` — erro interno

---

## `GET /api/auth/verificar-email?token=xxx`
**Autenticação:** Nenhuma (link de e-mail)

### Query params
- `token` — UUID gerado no cadastro

### Response
Redireciona para `${APP_URL}/auth/google-success?token={jwt}&redirect=/onboarding`
ou para `${APP_URL}/auth/login?error=token_expirado` em caso de erro.

### Lógica
1. Busca `EmailVerificacao` pelo token
2. Verifica se não foi usado e não expirou
3. Marca como usado, atualiza `emailVerificado: true` no usuário
4. Gera JWT e redireciona para onboarding (ou dashboard se já onboardado)

### Erros (via redirect)
- `?error=token_invalido` — token não informado
- `?error=token_expirado` — token não encontrado, já usado ou expirado
- `?error=erro_interno` — erro no banco

---

## `POST /api/auth/esqueci-senha`
**Autenticação:** Nenhuma (rota pública)
**Segurança:** Sempre retorna 200 — não revela se o e-mail está cadastrado.

### Request
```json
{
  "email": "string"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Se esse email estiver cadastrado, você receberá as instruções em breve."
}
```

### Lógica
1. Busca usuário por e-mail
2. Se encontrado: invalida tokens de reset anteriores não usados
3. Cria novo `SenhaReset` (expira em 1h)
4. Envia e-mail com link de reset (assíncrono)
5. Sempre retorna 200 independente de o e-mail existir

### Erros
- `400` — e-mail não informado
- `500` — erro interno

---

## `POST /api/auth/reset-senha`
**Autenticação:** Nenhuma (rota pública)

### Request
```json
{
  "token": "string — UUID do e-mail de reset",
  "novaSenha": "string — mínimo 8 chars, 1 maiúscula, 1 número"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Senha redefinida com sucesso!"
}
```

### Lógica
1. Valida força da nova senha
2. Busca `SenhaReset` pelo token
3. Verifica se não foi usado e não expirou
4. Faz hash da nova senha e atualiza o usuário
5. Marca o token como usado

### Erros
- `400` — campos obrigatórios faltando
- `400` — senha fraca (regras de validação)
- `400` — token inválido, já usado ou expirado
- `500` — erro interno

---

## Middleware (`src/middleware.ts`)
Intercepta todas as rotas `/api/*` exceto as públicas.

**Rotas públicas (bypass):**
- `/api/auth/` — todas as rotas de auth
- `/api/billing/webhook` — webhook Stripe
- `/api/bot/` — chatbot WhatsApp
- `/api/n8n/` — webhooks n8n
- `/api/public/` — dados públicos

**Para rotas protegidas:**
1. Extrai Bearer token do header `Authorization`
2. Verifica JWT com `jose.jwtVerify`
3. Injeta nos headers: `x-tenant-id`, `x-user-id`, `x-user-role`, `x-profissional-id`
4. Rotas `/api/admin/*` exigem `role === 'plataforma_admin'`

**Erros:**
- `401` — sem token
- `403` — token inválido, tenantId ausente, ou role insuficiente para admin
