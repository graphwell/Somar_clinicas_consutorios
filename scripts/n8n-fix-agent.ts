const N8N_URL = 'https://n8n.somar.ia.br'
// Token JWT da API do n8n (gerado em Settings → API no painel do n8n)
const N8N_API_KEY = process.env.N8N_API_KEY_N8N
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhM2E2ZmRiZS02ZDAzLTQ1ZjAtOGMxMS0xMThlYjc2NjZlOWEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMGE3Mzc2Y2EtNDgyNy00ODU5LThmNWEtNmY0ODBlYTcxZWU4IiwiaWF0IjoxNzc0Mjg0MjUyLCJleHAiOjE3Nzk0MjI0MDB9._RJqKyN5uZmhkjvpho6YQkCpBIdZHvOF_c-VEByyUgQ'
const WORKFLOW_ID = 'qEkpfit2dcWHbYol'

const H = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json',
}

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${N8N_URL}/api/v1${path}`, {
    ...opts,
    headers: { ...H, ...(opts?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(
    `${path}: ${res.status} ${await res.text()}`
  )
  return res.json()
}

async function main() {
  console.log('🔧 Lendo workflow...')
  const wf = await api(`/workflows/${WORKFLOW_ID}`)

  console.log('Nós encontrados:')
  wf.nodes.forEach((n: any) =>
    console.log(`  [${n.id}] "${n.name}" — ${n.type}`)
  )

  // FIX 1 — Migrar Conversational Agent → Tools Agent
  const nosAtualizados = wf.nodes.map((no: any) => {

    // Deprecated agent → Tools Agent:
    if (no.type === '@n8n/n8n-nodes-langchain.agent' &&
        no.parameters?.agentType === 'conversationalAgent') {
      console.log(`✏️  Migrando "${no.name}" para toolsAgent`)
      return {
        ...no,
        parameters: {
          ...no.parameters,
          agentType: 'toolsAgent',
          // Manter system message existente
        }
      }
    }
    return no
  })

  // FIX 2 — Corrigir referência ao nó "Carregar Contexto"
  // O agente referencia no System Message:
  // $('Carregar Contexto Clínica').item...
  // Precisamos encontrar o nome REAL do nó

  // Encontrar nó que busca contexto da clínica:
  const noContexto = wf.nodes.find((n: any) =>
    n.parameters?.url?.includes('/api/n8n/clinic-info') ||
    n.parameters?.url?.includes('/api/bot/contexto') ||
    n.name?.toLowerCase().includes('context') ||
    n.name?.toLowerCase().includes('clínica') ||
    n.name?.toLowerCase().includes('clinica')
  )

  console.log('Nó de contexto encontrado:',
    noContexto?.name ?? 'NÃO ENCONTRADO'
  )

  // Se o nome está diferente do que o agente espera,
  // renomear para o nome que o agente usa:
  const NOME_ESPERADO = 'Carregar Contexto Clínica'

  const nosComNomeCorrigido = nosAtualizados.map(
    (no: any) => {
      if (no.id === noContexto?.id &&
          no.name !== NOME_ESPERADO) {
        console.log(
          `✏️  Renomeando "${no.name}" → "${NOME_ESPERADO}"`
        )
        return { ...no, name: NOME_ESPERADO }
      }
      return no
    }
  )

  // FIX 3 — Corrigir conexões com nome antigo
  const conexoesCorrigidas: any = {}
  for (const [nomeNo, conn] of Object.entries(
    wf.connections as Record<string, any>
  )) {
    // Se o nome era o antigo, usar o novo:
    const nomeCorrigido = nomeNo === noContexto?.name &&
                          noContexto?.name !== NOME_ESPERADO
      ? NOME_ESPERADO
      : nomeNo
    conexoesCorrigidas[nomeCorrigido] = conn
  }

  // Salvar:
  console.log('\n💾 Salvando workflow corrigido...')

  // A API do n8n só aceita esses campos no PUT (campos read-only causam 400)
  await api(`/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: wf.name,
      nodes: nosComNomeCorrigido,
      connections: conexoesCorrigidas,
      settings: wf.settings ?? {},
      staticData: wf.staticData ?? null,
    }),
  })

  // Reativar:
  await api(
    `/workflows/${WORKFLOW_ID}/activate`,
    { method: 'POST' }
  )

  console.log('✅ Workflow corrigido e reativado!')
  console.log('\nPróximos passos:')
  console.log('1. Abrir workflow no N8N e verificar visualmente')
  console.log('2. Testar enviando mensagem no WhatsApp')
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
