# Módulo: auth-multitenant

## O que faz
Autenticação JWT multi-tenant com suporte a roles, convites por e-mail,
verificação de e-mail, reset de senha e controle de trial.
Cada tenant (empresa) é isolado por `tenantId` injetado via middleware.

O registro de uma nova conta cria automaticamente um tenant (empresa) e um
usuário administrador vinculado a ele. O middleware extrai o JWT de cada
requisição e injeta `x-tenant-id`, `x-user-id` e `x-user-role` nos headers
para que os route handlers não precisem decodificar o token novamente.

## Casos de uso
- SaaS B2B onde cada empresa tem seus próprios dados isolados
- Plataformas com múltiplos usuários por conta (admin, operador, profissional)
- Qualquer produto que precise de convites, verificação de e-mail e reset de senha

## Dependências externas
- `jose`: assinar/verificar JWT (HS256, expiração 7 dias)
- `bcryptjs`: hash de senhas (salt rounds 10)
- `Resend`: envio de e-mails transacionais (verificação, reset)

## Variáveis de ambiente necessárias
- `JWT_SECRET`: segredo para assinar tokens (mínimo 32 caracteres em produção)
- `NEXT_PUBLIC_APP_URL`: URL base para links nos e-mails
- `RESEND_API_KEY`: chave da API Resend

## Models do banco
- `Empresa` (alias Clinica): o tenant; possui `tenantId` único
- `Usuario`: usuário com role (admin/operador/profissional/plataforma_admin)
- `InviteToken`: tokens de convite com expiração de 7 dias
- `EmailVerificacao`: tokens de verificação de e-mail (24h)
- `SenhaReset`: tokens de reset de senha com expiração de 1h
- `PermissaoRole`: permissões granulares por role (recurso + ação)

## API Routes
- `POST /api/auth/register` — cadastro de nova conta (cria tenant + admin)
- `POST /api/auth/login` — login com e-mail/senha, retorna JWT
- `GET /api/auth/me` — dados do usuário autenticado + status do plano
- `GET /api/auth/verificar-email?token=xxx` — verificar e-mail via link
- `POST /api/auth/esqueci-senha` — solicitar reset de senha (sem revelar se e-mail existe)
- `POST /api/auth/reset-senha` — redefinir senha com token

## Fluxo de cadastro
1. POST /register → cria Empresa + Usuario (admin) em transação atômica
2. Gera token UUID de verificação e envia e-mail via Resend
3. Usuário clica no link → GET /verificar-email → marca `emailVerificado: true`
4. Redireciona para onboarding com JWT auto-logado

## Fluxo de reset de senha
1. POST /esqueci-senha → sempre retorna 200 (não revela se e-mail existe)
2. Se e-mail existe: invalida tokens anteriores, cria novo token (1h), envia e-mail
3. POST /reset-senha → valida token, valida força da senha, atualiza hash

## Validações de senha
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número

## Como adaptar para novo projeto
1. Copiar os models do `schema.prisma` deste módulo
2. Renomear `Clinica` para o nome do tenant no seu domínio (ex: `Empresa`, `Workspace`)
3. Ajustar o enum de roles conforme o negócio
4. Configurar templates de e-mail no Resend (ou substituir por outro provedor)
5. Definir as páginas de auth no frontend (`/auth/login`, `/auth/register`)

## O que NÃO está incluído (customizar)
- Layout e design das páginas de auth
- Lógica de onboarding pós-cadastro
- Integração com Google OAuth
- Limite de usuários por plano (combinar com módulo billing-saas)
- 2FA / MFA
