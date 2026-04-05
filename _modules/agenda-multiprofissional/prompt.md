# Prompt: Implementar agenda-multiprofissional

Implementar módulo de agenda multi-profissional em um projeto Next.js 14+ com Prisma e TypeScript.
NÃO quebrar nada existente. Leia os arquivos relevantes antes de começar.

---

## STACK ASSUMIDA
- Next.js App Router
- Prisma 5 + PostgreSQL
- TypeScript
- Módulo auth-multitenant já instalado

## PASSO 1 — SCHEMA PRISMA
Adicionar ao `prisma/schema.prisma`:

```prisma
model Profissional {
  id                   String   @id @default(uuid())
  nome                 String
  especialidade        String?
  registroProfissional String?
  bio                  String?
  fotoUrl              String?
  color                String?  @default("#4a4ae2")
  ativo                Boolean  @default(true)
  tenantId             String
  percentualRepasse    Float?   @default(0)
  repasseFixo          Float?   @default(0)
  repasseTipo          String?  @default("percentual")
  escalas              ProfessionalSchedule[]
  agendamentos         Agendamento[]
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  @@map("profissionais")
}

model ProfessionalSchedule {
  id             String       @id @default(uuid())
  profissionalId String
  diaSemana      Int          // 0=domingo ... 6=sábado
  horaInicio     String
  horaFim        String
  lunchStart     String?
  lunchEnd       String?
  ativo          Boolean      @default(true)
  profissional   Profissional @relation(fields: [profissionalId], references: [id])
  @@unique([profissionalId, diaSemana])
  @@map("professional_schedules")
}

model Servico {
  id                String       @id @default(uuid())
  nome              String
  descricao         String?
  duracaoMinutos    Int          @default(30)
  bufferTimeMinutes Int          @default(0)
  preco             Float        @default(0.0)
  color             String?      @default("#3B82F6")
  nicho             String?
  ativo             Boolean      @default(true)
  tenantId          String
  agendamentos      Agendamento[]
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  @@map("servicos")
}

model Agendamento {
  id              String   @id @default(uuid())
  pacienteId      String
  profissionalId  String?
  servicoId       String?
  dataHora        DateTime
  fimDataHora     DateTime
  durationMinutes Int      @default(30)
  status          String   @default("pendente")
  eventoId        String   @unique
  categoria       String?  @default("consulta")
  convenio        String?
  tipoAtendimento String   @default("particular")
  tenantId        String
  observacoes     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@map("agendamentos")
}

model ComboUpsell {
  idItem             String  @id @default(uuid()) @map("id")
  tenantId           String
  servicoGatilhoId   String
  servicoOferecidoId String
  descricaoOferta    String
  desconto           Float   @default(0.0)
  ativo              Boolean @default(true)
  createdAt          DateTime @default(now())
  @@map("combos_upsell")
}

model ConvenioEmpresa {
  id           String  @id @default(uuid())
  nomeConvenio String
  codigo       String?
  telefone     String?
  site         String?
  observacoes  String?
  logoUrl      String?
  ativo        Boolean @default(true)
  tenantId     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@map("convenios_empresa")
}

model ProfissionalConvenio {
  id             String   @id @default(uuid())
  profissionalId String
  convenioId     String
  tenantId       String
  ativo          Boolean  @default(true)
  createdAt      DateTime @default(now())
  @@unique([profissionalId, convenioId])
  @@map("profissional_convenios")
}
```

Rodar: `npx prisma db push`

---

## PASSO 2 — ROTA PRINCIPAL DE AGENDAMENTOS (`src/app/api/appointments/route.ts`)

### GET
1. Ler `tenantId`, `role`, `profissionalId` dos headers
2. Se role=profissional: `where.profissionalId = profissionalId`
3. Buscar com include (paciente, servico, profissional), take: 100, orderBy: dataHora desc

### POST
1. Validar `pacienteId` e `dataHora`
2. Validar convênio se `tipoAtendimento=convenio`:
   - Buscar ConvenioEmpresa por nome
   - Buscar ProfissionalConvenio do profissional
   - Se tem convênios cadastrados e não aceita este: retornar 422 com lista dos aceitos
3. Calcular `fimDataHora = new Date(dataHora).getTime() + durationMinutes * 60000`
4. Gerar `eventoId = manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
5. Criar e retornar agendamento

---

## PASSO 3 — SLOTS DISPONÍVEIS (`src/app/api/appointments/agenda/route.ts`)

```typescript
// GET ?profissionalId=xxx&data=2026-04-04&servicoId=yyy
// 1. Buscar ProfessionalSchedule para o diaSemana da data
// 2. Buscar Servico para obter duração + buffer
// 3. Gerar slots de horaInicio até horaFim com intervalo = duracaoMinutos + buffer
// 4. Excluir período de almoço (lunchStart-lunchEnd)
// 5. Buscar agendamentos existentes na data para o profissional
// 6. Marcar slots como indisponível se overlap com agendamento existente
function horasEmMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
```

---

## PASSO 4 — AGENDAMENTOS DE HOJE (`src/app/api/appointments/hoje/route.ts`)
```typescript
// GET — agendamentos do dia atual
const hoje = new Date();
const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
```

---

## ORDEM DE EXECUÇÃO
1. Adicionar schema e rodar `npx prisma db push`
2. Criar rota `/api/appointments/route.ts` (GET + POST)
3. Criar rota `/api/appointments/hoje/route.ts`
4. Criar rota `/api/appointments/semana/route.ts`
5. Criar rota `/api/appointments/agenda/route.ts` (cálculo de slots)
6. Criar interfaces de frontend (calendário, lista do dia)

---

## REGRAS CRÍTICAS
- SEMPRE filtrar por `tenantId` em todas as queries
- Profissional (role=profissional) só pode ver/criar seus próprios agendamentos
- O `eventoId` deve ser único — usar timestamp + random para evitar colisão
- Validar convênio no servidor (nunca confiar apenas no frontend)
- A validação de convênio deve ser tolerante: se profissional não tem convênios cadastrados, aceitar qualquer um
- Buffer time: ao calcular slots, somar `bufferTimeMinutes` à duração para evitar sobreposição
