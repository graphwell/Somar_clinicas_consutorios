# Prompt: Implementar prontuario-ia

Implementar módulo de prontuário clínico digital com IA em um projeto Next.js 14+ com Prisma e TypeScript.
NÃO quebrar nada existente. Leia os arquivos relevantes antes de começar.

---

## STACK ASSUMIDA
- Next.js App Router
- Prisma 5 + PostgreSQL
- TypeScript
- Módulos auth-multitenant e agenda-multiprofissional já instalados
- Google Gemini como LLM (substituível por outro)

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS
```
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-1.5-flash
AI_PROVIDER=gemini
AI_TIMEOUT_MS=30000
AI_RATE_LIMIT=10
```

---

## PASSO 1 — SCHEMA PRISMA
Adicionar ao `prisma/schema.prisma`:

```prisma
enum StatusDente {
  HIGIDO
  CARIE
  RESTAURADO
  EXTRACAO_INDICADA
  EXTRAIDO
  COROA
  IMPLANTE
  CANAL
  FRATURA
}

model ProntuarioRegistro {
  id                  String    @id @default(cuid())
  pacienteId          String
  tenantId            String
  profissionalId      String?
  tipo                String
  agendamentoId       String?
  queixaPrincipal     String?
  evolucao            String?
  historiaMolestia    String?
  historicoMedico     String?
  medicamentosUso     String?
  alergias            String?
  exameSolicitado     String?
  exameResultado      String?
  hipoteseDiagnostica String?
  conduta             String?
  retornoEm           DateTime?
  cidCodigo           String?
  cidDescricao        String?
  pressaoSistolica    Int?
  pressaoDiastolica   Int?
  temperatura         Float?
  saturacao           Int?
  glicemia            Int?
  historicoAlimentar  String?
  restricoes          String?
  objetivoPaciente    String?
  planoAlimentar      String?
  recordatorio24h     String?
  metas               String?
  iaRascunho          String?
  iaPromptUsado       String?
  iaRevisado          Boolean   @default(false)
  transcricaoOriginal String?
  soapSubjetivo       String?
  soapObjetivo        String?
  soapAvaliacao       String?
  soapPlano           String?
  assinadoPor         String?
  assinadoEm          DateTime?
  assinaturaHash      String?
  protocoloEstetico   String?
  regiaoTratada       String?
  produtosUsados      String?
  fotosAntesDep       Json?
  escalasAplicadas    Json?
  objetivosTerapeuticos String?
  evolucaoPsico       String?
  medidas             MedidaCorporal[]
  odontograma         OdontogramaItem[]
  arquivos            ProntuarioArquivo[]
  cidsSugeridos       CidSugerido[]
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  @@map("prontuario_registros")
}

model CidSugerido {
  id           String             @id @default(cuid())
  prontuarioId String
  codigo       String
  descricao    String
  relevancia   Float              @default(1.0)
  confirmado   Boolean            @default(false)
  prontuario   ProntuarioRegistro @relation(fields: [prontuarioId], references: [id], onDelete: Cascade)
  createdAt    DateTime           @default(now())
  @@map("cids_sugeridos")
}

model ProntuarioArquivo {
  id            String             @id @default(cuid())
  evolutionId   String
  pacienteId    String
  tenantId      String
  nome          String
  tipo          String
  url           String?
  descricao     String?
  iaResumo      String?
  deletarEm     DateTime?
  deletado      Boolean            @default(false)
  consentimento Boolean            @default(false)
  evolution     ProntuarioRegistro @relation(fields: [evolutionId], references: [id], onDelete: Cascade)
  createdAt     DateTime           @default(now())
  @@map("prontuario_arquivos")
}

model ProntuarioTemplate {
  id             String   @id @default(cuid())
  profissionalId String?
  tenantId       String
  nome           String
  especialidade  String?
  isGlobal       Boolean  @default(false)
  campos         Json
  createdAt      DateTime @default(now())
  @@map("prontuario_templates")
}

model MedidaCorporal {
  id            String             @id @default(cuid())
  prontuarioId  String
  peso          Float?
  altura        Float?
  imc           Float?
  percGordura   Float?
  circAbdominal Float?
  circQuadril   Float?
  circBraco     Float?
  circCoxa      Float?
  prontuario    ProntuarioRegistro @relation(fields: [prontuarioId], references: [id], onDelete: Cascade)
  createdAt     DateTime           @default(now())
  @@map("medidas_corporais")
}

model OdontogramaItem {
  id            String             @id @default(cuid())
  prontuarioId  String
  pacienteId    String
  tenantId      String
  numeroDente   Int
  status        StatusDente        @default(HIGIDO)
  facesAfetadas Json?
  observacao    String?
  atualizadoPor String?
  prontuario    ProntuarioRegistro @relation(fields: [prontuarioId], references: [id], onDelete: Cascade)
  atualizadoEm  DateTime           @updatedAt
  createdAt     DateTime           @default(now())
  @@unique([prontuarioId, numeroDente])
  @@map("odontograma_itens")
}

model OdontogramaHistorico {
  id             String       @id @default(cuid())
  numeroDente    Int
  statusAnterior StatusDente?
  statusNovo     StatusDente
  observacao     String?
  alteradoPor    String?
  tenantId       String
  pacienteId     String
  createdAt      DateTime     @default(now())
  @@map("odontograma_historico")
}

model PacienteAlergia {
  id         String   @id @default(cuid())
  pacienteId String
  tenantId   String
  descricao  String
  gravidade  String   @default("MODERADA")
  createdAt  DateTime @default(now())
  @@map("paciente_alergias")
}

model PacienteMedicamento {
  id         String    @id @default(cuid())
  pacienteId String
  tenantId   String
  nome       String
  dosagem    String?
  frequencia String?
  uso        String    @default("CONTINUO")
  inicio     DateTime?
  fim        DateTime?
  ativo      Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  @@map("paciente_medicamentos")
}
```

Rodar: `npx prisma db push`

---

## PASSO 2 — ROTA PRINCIPAL (`src/app/api/prontuario/route.ts`)
**POST** para criar evolução:
1. Verificar que paciente pertence ao tenant
2. Criar ProntuarioRegistro com todos os campos fornecidos
3. Se `medidas` fornecidas: criar MedidaCorporal vinculada
4. Calcular IMC se peso e altura presentes: `imc = peso / (altura/100)^2`

---

## PASSO 3 — ROTA POR PACIENTE (`src/app/api/prontuario/[pacienteId]/route.ts`)
**GET**:
1. Verificar acesso (profissional vê apenas os seus)
2. Buscar com include de medidas, odontograma, arquivos, CIDs

---

## PASSO 4 — ASSINATURA DIGITAL (`src/app/api/prontuario/assinar/route.ts`)
```typescript
import { createHash } from 'crypto';

// Montar string de conteúdo para hash
const conteudo = [
  evolucao, queixaPrincipal, hipoteseDiagnostica,
  conduta, cidCodigo, soapSubjetivo, soapObjetivo,
  soapAvaliacao, soapPlano,
].filter(Boolean).join('|');

const assinaturaHash = createHash('sha256').update(conteudo).digest('hex');
```

---

## PASSO 5 — IA RASCUNHO (`src/app/api/prontuario/ia/rascunho/route.ts`)
```typescript
// Prompt para estruturar prontuário a partir de texto livre
const prompt = `
Você é um assistente médico. Estruture o seguinte relato em campos de prontuário:

RELATO: ${texto}

Retorne JSON com: queixaPrincipal, evolucao, hipoteseDiagnostica, conduta, retornoEm (data ISO ou null)
e cidSugerido: { codigo, descricao } (CID-10 mais provável ou null).
`;
```

---

## ORDEM DE EXECUÇÃO
1. Adicionar schema e rodar `npx prisma db push`
2. Criar rotas de CRUD do prontuário
3. Criar rotas de alergias e medicamentos
4. Implementar assinatura digital
5. Implementar rotas de IA (rascunho, CID, transcrição)
6. Criar rota de adendo

---

## REGRAS CRÍTICAS
- SEMPRE filtrar por `tenantId` em todas as queries
- NUNCA permitir edição de prontuário já assinado — apenas adendos
- LGPD: arquivos devem ter `consentimento: true` antes do upload
- LGPD: implementar job que deleta arquivos com `deletarEm < now()` mas preserva `iaResumo`
- Profissional vê apenas seus próprios prontuários
- Calcular IMC automaticamente ao receber peso e altura
- Assinatura digital deve incluir todos os campos clínicos principais no hash
- Adendo deve append ao campo `evolucao` com timestamp: "\n\n[ADENDO - DD/MM/YYYY HH:MM] texto"
