# Prompt: Implementar auth-multitenant

Implementar autenticação JWT multi-tenant em um projeto Next.js 14+ com Prisma e TypeScript.
NÃO quebrar nada existente. Leia os arquivos relevantes antes de começar.

---

## STACK ASSUMIDA
- Next.js App Router (src/app/)
- Prisma 5 + PostgreSQL
- TypeScript
- JWT via `jose`
- Tailwind CSS

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS
```
JWT_SECRET=sua_chave_secreta_minimo_32_chars
NEXT_PUBLIC_APP_URL=https://seuapp.com
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

---

## PASSO 1 — DEPENDÊNCIAS
```bash
npm install jose bcryptjs
npm install -D @types/bcryptjs
```

---

## PASSO 2 — SCHEMA PRISMA
Adicionar ao `prisma/schema.prisma`:

```prisma
model Empresa {
  id                  String    @id @default(uuid())
  tenantId            String    @unique
  slug                String    @unique @default("empresa-default")
  nome                String
  onboardingCompleted Boolean   @default(false)
  usuarios            Usuario[]
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  @@map("empresas")
}

model Usuario {
  id              String    @id @default(uuid())
  nome            String?
  sobrenome       String?
  telefone        String?
  email           String    @unique
  senhaHash       String?
  role            String    @default("operador") // admin | operador | profissional | plataforma_admin
  tenantId        String
  emailVerificado Boolean   @default(false)
  acessoExpiraEm  DateTime?
  primeiroAcesso  Boolean   @default(true)
  perfilCompleto  Boolean   @default(false)
  avatarUrl       String?
  empresa         Empresa   @relation(fields: [tenantId], references: [tenantId])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  @@map("usuarios")
}

model InviteToken {
  id            String   @id @default(uuid())
  token         String   @unique
  email         String
  nome          String?
  role          String   @default("operador")
  tenantId      String
  convidadoPor  String?
  used          Boolean  @default(false)
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  @@map("invite_tokens")
}

model EmailVerificacao {
  id        String   @id @default(uuid())
  email     String
  token     String   @unique
  usado     Boolean  @default(false)
  expiraEm  DateTime
  createdAt DateTime @default(now())
  @@map("email_verificacoes")
}

model SenhaReset {
  id        String   @id @default(uuid())
  email     String
  token     String   @unique
  usado     Boolean  @default(false)
  expiraEm  DateTime
  createdAt DateTime @default(now())
  @@map("senha_resets")
}

model PermissaoRole {
  id       String  @id @default(uuid())
  tenantId String
  role     String
  recurso  String
  acao     String
  ativo    Boolean @default(true)
  @@unique([tenantId, role, recurso, acao])
  @@map("permissoes_role")
}
```

Rodar: `npx prisma db push`

---

## PASSO 3 — LIB DE AUTH (`src/lib/auth.ts`)
Criar o arquivo com as funções de hash e JWT:

```typescript
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'troque-em-producao'
);

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  profissionalId?: string;
  acessoExpiraEm?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, await bcrypt.genSalt(10));
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}
```

---

## PASSO 4 — MIDDLEWARE (`src/middleware.ts`)
Criar o middleware que protege todas as rotas `/api/*`:

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

const ROTAS_PUBLICAS = [
  '/api/auth/',
  '/api/billing/webhook',
  '/api/bot/',
  '/api/n8n/',
  '/api/public/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ROTAS_PUBLICAS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Sessão expirada ou inválida' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    if (pathname.startsWith('/api/admin') && payload.role !== 'plataforma_admin') {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
    }

    const headers = new Headers(request.headers);
    headers.set('x-tenant-id', payload.tenantId);
    headers.set('x-user-id', payload.userId);
    headers.set('x-user-role', payload.role);

    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json({ error: 'Erro interno no middleware' }, { status: 500 });
  }
}

export const config = { matcher: ['/api/:path*'] };
```

---

## PASSO 5 — ROTAS DE AUTH

### `src/app/api/auth/register/route.ts`
Lógica:
1. Validar nome (2+ chars), e-mail (regex), senha (8+, maiúscula, número), nomeEmpresa
2. Verificar se e-mail já existe
3. Transação atômica: criar Empresa (tenantId = `tenant_${uuid().slice(0,8)}`) + Usuario (role=admin)
4. Criar EmailVerificacao (expira 24h), enviar e-mail assíncrono
5. Retornar `{ success: true, email }`

### `src/app/api/auth/login/route.ts`
Lógica:
1. Buscar usuário por e-mail com include na empresa
2. Verificar senha com `comparePassword`
3. Checar `acessoExpiraEm` para acesso temporário
4. Gerar JWT e retornar `{ token, user: { id, nome, email, role, tenantId, ... } }`

### `src/app/api/auth/me/route.ts`
Lógica:
1. Verificar JWT manualmente (não via middleware — rota `/api/auth/` é pública)
2. Buscar usuário no banco para role atualizada
3. Buscar ou criar Assinatura trial
4. Checar expiração do trial, calcular dias restantes
5. Retornar status do plano e permissão de acesso

### `src/app/api/auth/verificar-email/route.ts` (GET com query ?token=)
Lógica:
1. Buscar EmailVerificacao pelo token
2. Verificar `!usado && expiraEm > now()`
3. Marcar como usado, atualizar `emailVerificado: true`
4. Gerar JWT, redirecionar para `/onboarding` ou `/dashboard`

### `src/app/api/auth/esqueci-senha/route.ts`
Lógica:
1. SEMPRE retornar 200 (segurança — não revelar se e-mail existe)
2. Se usuário existir: invalidar tokens anteriores, criar SenhaReset (1h), enviar e-mail

### `src/app/api/auth/reset-senha/route.ts`
Lógica:
1. Validar força da nova senha
2. Buscar SenhaReset, verificar `!usado && expiraEm > now()`
3. Atualizar senha com hash, marcar token como usado

---

## PASSO 6 — HELPER DE SESSÃO (`src/lib/auth-helpers.ts`)
Criar helper para extrair sessão nos route handlers:

```typescript
import { headers } from 'next/headers';

export async function getSessionInfo() {
  const h = await headers();
  const tenantId = h.get('x-tenant-id') || '';
  const userId = h.get('x-user-id') || '';
  const role = h.get('x-user-role') || '';
  return { tenantId, userId, role };
}
```

---

## ORDEM DE EXECUÇÃO
1. Instalar dependências (`npm install jose bcryptjs`)
2. Adicionar models ao schema e rodar `npx prisma db push`
3. Criar `src/lib/auth.ts`
4. Criar `src/middleware.ts`
5. Criar `src/lib/auth-helpers.ts`
6. Criar as 6 rotas de auth
7. Configurar templates de e-mail no Resend (ou outro provedor)
8. Criar páginas de frontend `/auth/login` e `/auth/register`

---

## REGRAS CRÍTICAS
- NUNCA retornar `senhaHash` em nenhuma resposta de API
- NUNCA revelar se um e-mail está ou não cadastrado no endpoint esqueci-senha
- SEMPRE fazer `where: { tenantId }` em queries de dados do tenant
- NUNCA compartilhar dados entre tenants
- O middleware injeta headers — route handlers NÃO precisam verificar o token novamente
- Tokens de verificação e reset são de uso único (`usado: true` após usar)
- Acesso temporário: verificar `acessoExpiraEm` no login e em rotas sensíveis
