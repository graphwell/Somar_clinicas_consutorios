// scripts/n8n-migrate-state-machine.mjs
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envLines = readFileSync(resolve(process.cwd(), '.env'), 'utf8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '')
}

const N8N_URL = 'https://n8n.somar.ia.br'
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhM2E2ZmRiZS02ZDAzLTQ1ZjAtOGMxMS0xMThlYjc2NjZlOWEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMGE3Mzc2Y2EtNDgyNy00ODU5LThmNWEtNmY0ODBlYTcxZWU4IiwiaWF0IjoxNzc0Mjg0MjUyLCJleHAiOjE3Nzk0MjI0MDB9._RJqKyN5uZmhkjvpho6YQkCpBIdZHvOF_c-VEByyUgQ'
const WF_ID = 'qEkpfit2dcWHbYol'
const SYNKA = 'https://synka.somar.ia.br'
const KEY = 'synka132504fE@'

async function api(path, opts = {}) {
  const res = await fetch(`${N8N_URL}/api/v1${path}`, {
    ...opts,
    headers: { 'X-N8N-API-KEY': JWT, 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text.slice(0, 400)}`)
  return JSON.parse(text)
}

const WA_TO = `={{ $('Webhook WhatsApp').item.json.body?.telefone || $('Webhook WhatsApp').item.json.telefone }}`
const TENANT = `={{ $('Carregar Contexto Clínica').item.json.data.tenantId }}`
const ESTADO_DADOS = `={{ $('Buscar Estado').item.json.data.dados }}`

function http(id, name, method, url, pos, body, query) {
  return {
    id, name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos,
    parameters: {
      method, url,
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'x-api-key', value: KEY }] },
      ...(body ? { sendBody: true, contentType: 'json', bodyParameters: { parameters: Object.entries(body).map(([n, v]) => ({ name: n, value: v })) } } : {}),
      ...(query ? { sendQuery: true, queryParameters: { parameters: Object.entries(query).map(([n, v]) => ({ name: n, value: v })) } } : {}),
      options: {},
    },
  }
}

function ifNode(id, name, pos, leftValue, rightValue, type = 'string') {
  return {
    id, name, type: 'n8n-nodes-base.if', typeVersion: 2, position: pos,
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{ id: id + '-c', leftValue, rightValue, operator: { type, operation: 'equals' } }],
        combinator: 'and',
      },
    },
  }
}

function code(id, name, pos, jsCode) {
  return { id, name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } }
}

async function main() {
  console.log('Lendo workflow...')
  const wf = await api(`/workflows/${WF_ID}`)

  const nodes = [
    // ── NÍVEL 1: Contexto já existente ───────────────────────────────────────
    // webhook-evolution e fetch-context mantidos

    // ── NÍVEL 2: Buscar estado no DB ─────────────────────────────────────────
    http('buscar-estado', 'Buscar Estado', 'GET', `${SYNKA}/api/n8n/estado?_key=${KEY}`, [800, 400], undefined,
      { telefone: WA_TO, tenantId: TENANT }),

    // ── NÍVEL 3: IF chain por estado ─────────────────────────────────────────
    // IF: estado vazio → nova conversa
    ifNode('if-nova', 'Nova Conversa?', [1050, 300], `={{ $json.data.estado ?? '' }}`, '', 'string'),
    // IF: aguardando_nome
    ifNode('if-nome', 'Aguardando Nome?', [1050, 450], `={{ $json.data.estado }}`, 'aguardando_nome'),
    // IF: aguardando_servico
    ifNode('if-servico', 'Aguardando Serviço?', [1050, 600], `={{ $json.data.estado }}`, 'aguardando_servico'),
    // IF: aguardando_data
    ifNode('if-data', 'Aguardando Data?', [1050, 750], `={{ $json.data.estado }}`, 'aguardando_data'),
    // IF: aguardando_pagto
    ifNode('if-pagto', 'Aguardando Pagto?', [1050, 900], `={{ $json.data.estado }}`, 'aguardando_pagto'),
    // IF: aguardando_pix
    ifNode('if-pix-estado', 'Aguardando PIX?', [1050, 1050], `={{ $json.data.estado }}`, 'aguardando_pix'),

    // ── NÍVEL 4: Ações por estado ─────────────────────────────────────────────

    // Nova conversa → buscar cliente
    http('id-cliente', 'Identificar Cliente', 'GET', `${SYNKA}/api/n8n/client-info?_key=${KEY}`, [1300, 180], undefined,
      { tenantId: TENANT, whatsapp: WA_TO }),

    code('prep-boas-vindas', 'Preparar Boas-Vindas', [1550, 180], `
const c = $input.first().json.data || {}
if (c.cadastrado) {
  const primeiro = c.nome.split(' ')[0]
  const ult = c.ultimoServico?.nome
  const prof = c.ultimoProfissional?.nome
  const hist = ult ? '\\nSeu último atendimento: ' + ult + (prof ? ' com ' + prof : '') + '.' : ''
  return [{ json: {
    mensagem: 'Olá ' + primeiro + '!' + hist + '\\n\\nDeseja agendar? Qual serviço?',
    novoEstado: 'aguardando_servico',
    dadosEstado: { nome: c.nome, ultimoServico: c.ultimoServico, ultimoProfissional: c.ultimoProfissional }
  }}]
}
return [{ json: {
  mensagem: 'Olá! Para agendar, qual é o seu nome completo?',
  novoEstado: 'aguardando_nome',
  dadosEstado: {}
}}]`),

    // Aguardando nome → salvar nome
    code('proc-nome', 'Processar Nome', [1300, 450], `
const msg = ($('Webhook WhatsApp').first().json.body?.mensagem || $('Webhook WhatsApp').first().json.mensagem || '').trim()
if (msg.length < 2) return [{ json: { mensagem: 'Informe seu nome completo.', novoEstado: 'aguardando_nome', dadosEstado: {} }}]
return [{ json: {
  mensagem: 'Obrigado, ' + msg.split(' ')[0] + '! Qual serviço deseja?\\nDigite o número.',
  novoEstado: 'aguardando_servico',
  dadosEstado: { nome: msg }
}}]`),

    // Aguardando serviço → listar + processar
    http('listar-srv', 'Listar Serviços SM', 'GET', `${SYNKA}/api/n8n/list-metadata?_key=${KEY}`, [1300, 600], undefined,
      { tenantId: TENANT, tipo: 'servicos' }),

    code('proc-servico', 'Processar Serviço SM', [1550, 600], `
const msg = ($('Webhook WhatsApp').first().json.body?.mensagem || $('Webhook WhatsApp').first().json.mensagem || '').trim()
const dados = ($('Buscar Estado').first().json.data?.dados) || {}
const items = $input.first().json.data?.items || []
const num = parseInt(msg)
let srv = null
if (!isNaN(num) && num >= 1 && num <= items.length) {
  const it = items[num - 1]
  srv = { id: it.servicoId, nome: it.nome, preco: it.preco }
} else {
  const f = items.find(s => s.nome.toLowerCase().includes(msg.toLowerCase()))
  if (f) srv = { id: f.servicoId, nome: f.nome, preco: f.preco }
}
if (!srv) {
  const lista = items.map((s,i) => (i+1) + ' - ' + s.nome).join('\\n')
  return [{ json: { mensagem: 'Opção inválida. Escolha:\\n\\n' + lista, novoEstado: 'aguardando_servico', dadosEstado: { ...dados, _items: items } }}]
}
return [{ json: { mensagem: srv.nome + ' selecionado!\\nQual data e horário? Ex: "dia 24 às 14h"', novoEstado: 'aguardando_data', dadosEstado: { ...dados, servico: srv } }}]`),

    // Aguardando data → parsear + verificar disp
    code('proc-data', 'Processar Data SM', [1300, 750], `
const msg = ($('Webhook WhatsApp').first().json.body?.mensagem || $('Webhook WhatsApp').first().json.mensagem || '').trim()
const dados = ($('Buscar Estado').first().json.data?.dados) || {}
const hoje = new Date(); const ano = hoje.getFullYear(); const mes = hoje.getMonth() + 1
const diaM = msg.match(/dia\\s*(\\d{1,2})|(\\d{1,2})\\s*[\\/\\-]|(^|\\s)(\\d{1,2})($|\\s)/)
const horaM = msg.match(/(\\d{1,2})\\s*[hH:]\\s*(\\d{0,2})/)
const dia = diaM ? parseInt(diaM[1]||diaM[2]||diaM[4]) : null
const hora = horaM ? parseInt(horaM[1]) : null
const min = horaM && horaM[2] ? parseInt(horaM[2])||0 : 0
if (!dia || !hora) return [{ json: { mensagem: 'Informe o dia e horário. Ex: "dia 24 às 14h"', novoEstado: 'aguardando_data', dadosEstado: dados }}]
const data = ano + '-' + String(mes).padStart(2,'0') + '-' + String(dia).padStart(2,'0')
const horario = String(hora).padStart(2,'0') + ':' + String(min).padStart(2,'0')
return [{ json: { data, horario, dadosEstado: { ...dados, data, horario } }}]`),

    http('verif-disp', 'Verificar Disp SM', 'GET', `${SYNKA}/api/n8n/agenda/disponibilidade?_key=${KEY}`, [1550, 750], undefined,
      { tenantId: TENANT, data: `={{ $json.data }}`, servicoId: `={{ $json.dadosEstado?.servico?.id ?? '' }}` }),

    code('proc-disp', 'Processar Disponibilidade', [1800, 750], `
const res = $input.first().json.data || {}
const profs = res.profissionais || []
const dados = $('Processar Data SM').first().json.dadosEstado || {}
const horario = dados.horario
let profEscolhido = null
for (const p of profs) { if (p.slots?.includes(horario)) { profEscolhido = p; break } }
if (!profEscolhido) {
  const p0 = profs.find(p => p.slots?.length > 0)
  const opts = p0?.slots?.slice(0,10).join(', ') || 'nenhum'
  return [{ json: { mensagem: 'Horário ' + horario + ' indisponível em ' + dados.data + '.\\nDisponíveis: ' + opts, novoEstado: 'aguardando_data', dadosEstado: dados }}]
}
const val = dados.servico?.preco || 0
const vFmt = 'R$ ' + parseFloat(val).toFixed(2).replace('.',',')
return [{ json: {
  mensagem: 'Disponível!\\n\\nServiço: ' + (dados.servico?.nome||'') + '\\nProfissional: ' + profEscolhido.nome + '\\nData: ' + dados.data + '\\nHorário: ' + horario + '\\nValor: ' + vFmt + '\\n\\nComo pagar?\\n1 - No dia\\n2 - PIX agora',
  novoEstado: 'aguardando_pagto',
  dadosEstado: { ...dados, profissional: { id: profEscolhido.id, nome: profEscolhido.nome }, valor: val }
}}]`),

    // Aguardando pagto → processar
    code('proc-pagto', 'Processar Pagto SM', [1300, 900], `
const msg = ($('Webhook WhatsApp').first().json.body?.mensagem || $('Webhook WhatsApp').first().json.mensagem || '').trim()
const dados = ($('Buscar Estado').first().json.data?.dados) || {}
const op = msg.replace(/[^12]/g,'').charAt(0)
if (!['1','2'].includes(op)) return [{ json: { mensagem: 'Responda 1 (no dia) ou 2 (PIX agora).', novoEstado: 'aguardando_pagto', dadosEstado: dados, gerarPix: false }}]
return [{ json: { op, gerarPix: op==='2', valor: dados.valor||0, novoEstado: op==='2'?'aguardando_pix':'criando', dadosEstado: { ...dados, opcaoPagto: op==='1'?'local':'pix' } }}]`),

    ifNode('if-gerar-pix', 'Gerar PIX?', [1550, 900], `={{ $json.gerarPix }}`, true, 'boolean'),

    http('gerar-pix-sm', 'Gerar PIX SM', 'POST', `${SYNKA}/api/n8n/pagamento/gerar-pix?_key=${KEY}`, [1800, 820],
      { tenantId: TENANT, valor: `={{ $json.valor }}` }),

    {
      id: 'msg-pix-sm', name: 'Msg PIX SM', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [2050, 820],
      parameters: { mode: 'manual', fields: { values: [
        { name: 'mensagem', value: `={{ ($json.data?.msg ?? '') + '\\n\\nApós pagar, responda SIM para confirmar.' }}` },
        { name: 'novoEstado', value: 'aguardando_pix' },
        { name: 'dadosEstado', value: `={{ $('Processar Pagto SM').item.json.dadosEstado }}` },
      ]}},
    },

    http('criar-sem-pix', 'Criar Sem PIX', 'POST', `${SYNKA}/api/n8n/agenda/criar?_key=${KEY}`, [1800, 980], {
      tenantId: TENANT,
      clienteTelefone: WA_TO,
      clienteNome: `={{ $('Buscar Estado').item.json.data.dados?.nome ?? '' }}`,
      servicoId: `={{ $('Buscar Estado').item.json.data.dados?.servico?.id }}`,
      profissionalId: `={{ $('Buscar Estado').item.json.data.dados?.profissional?.id }}`,
      data: `={{ $('Buscar Estado').item.json.data.dados?.data }}`,
      horario: `={{ $('Buscar Estado').item.json.data.dados?.horario }}`,
      opcaoPagamento: 'local',
    }),

    // Aguardando pix → confirmar com SIM
    {
      id: 'if-sim-pix', name: 'É SIM (PIX)?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [1300, 1050],
      parameters: { conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{ id: 'c-sim', leftValue: `={{ ($('Webhook WhatsApp').item.json.body?.mensagem || $('Webhook WhatsApp').item.json.mensagem || '').trim().toLowerCase() }}`, rightValue: 'sim', operator: { type: 'string', operation: 'contains' } }],
        combinator: 'and' } },
    },

    http('criar-apos-pix', 'Criar Após PIX', 'POST', `${SYNKA}/api/n8n/agenda/criar?_key=${KEY}`, [1550, 1000], {
      tenantId: TENANT,
      clienteTelefone: WA_TO,
      clienteNome: `={{ $('Buscar Estado').item.json.data.dados?.nome ?? '' }}`,
      servicoId: `={{ $('Buscar Estado').item.json.data.dados?.servico?.id }}`,
      profissionalId: `={{ $('Buscar Estado').item.json.data.dados?.profissional?.id }}`,
      data: `={{ $('Buscar Estado').item.json.data.dados?.data }}`,
      horario: `={{ $('Buscar Estado').item.json.data.dados?.horario }}`,
      opcaoPagamento: 'pix',
    }),

    {
      id: 'msg-aguarda-pix', name: 'Msg Aguarda Comprovante', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [1550, 1100],
      parameters: { mode: 'manual', fields: { values: [
        { name: 'mensagem', value: 'Aguardando seu comprovante de pagamento. Após pagar, responda SIM.' },
        { name: 'novoEstado', value: 'aguardando_pix' },
        { name: 'dadosEstado', value: `={{ $('Buscar Estado').item.json.data.dados }}` },
      ]}},
    },

    // Confirmação comum
    {
      id: 'msg-confirmado', name: 'Msg Confirmado SM', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [2050, 980],
      parameters: { mode: 'manual', fields: { values: [
        { name: 'mensagem', value: `={{ $json.data?.msgConfirmacao ?? 'Agendamento confirmado! Protocolo #' + $json.data?.protocolo + '. Até lá!' }}` },
        { name: 'novoEstado', value: 'confirmado' },
        { name: 'dadosEstado', value: '{}' },
      ]}},
    },

    // Salvar estado (hub)
    http('salvar-estado-sm', 'Salvar Estado SM', 'POST', `${SYNKA}/api/n8n/estado?_key=${KEY}`, [2300, 600], {
      telefone: WA_TO,
      tenantId: TENANT,
      etapa: `={{ $json.novoEstado }}`,
      dados: `={{ JSON.stringify($json.dadosEstado ?? {}) }}`,
      mensagem: `={{ $json.mensagem }}`
    }),

    // Limpar estado
    http('limpar-estado-sm', 'Limpar Estado SM', 'DELETE', `${SYNKA}/api/n8n/estado?_key=${KEY}`, [2300, 980], undefined,
      { telefone: WA_TO, tenantId: TENANT, mensagem: `={{ $json.mensagem }}` }),

    // Enviar resposta WA (UltraMsg)
    {
      id: 'enviar-sm', name: 'Enviar WA SM', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2550, 700],
      parameters: {
        method: 'POST',
        url: 'https://api.ultramsg.com/instance168762/messages/chat?token=xp3fx1lj7lsnozzg',
        sendBody: true, contentType: 'form-urlencoded',
        bodyParameters: { parameters: [
          { name: 'to', value: WA_TO },
          { name: 'body', value: `={{ $json.data?.mensagem ?? 'Erro ao processar.' }}` },
        ]},
        options: {},
      },
    },
  ]

  // ── CONEXÕES ─────────────────────────────────────────────────────────────────
  const conn = {
    'Webhook WhatsApp': { main: [[{ node: 'Carregar Contexto Clínica', type: 'main', index: 0 }]] },
    'Carregar Contexto Clínica': { main: [[{ node: 'Buscar Estado', type: 'main', index: 0 }]] },
    'Buscar Estado': { main: [[{ node: 'Nova Conversa?', type: 'main', index: 0 }]] },

    'Nova Conversa?': { main: [
      [{ node: 'Identificar Cliente', type: 'main', index: 0 }],  // true: estado vazio
      [{ node: 'Aguardando Nome?', type: 'main', index: 0 }],     // false: tem estado
    ]},
    'Aguardando Nome?': { main: [
      [{ node: 'Processar Nome', type: 'main', index: 0 }],
      [{ node: 'Aguardando Serviço?', type: 'main', index: 0 }],
    ]},
    'Aguardando Serviço?': { main: [
      [{ node: 'Listar Serviços SM', type: 'main', index: 0 }],
      [{ node: 'Aguardando Data?', type: 'main', index: 0 }],
    ]},
    'Aguardando Data?': { main: [
      [{ node: 'Processar Data SM', type: 'main', index: 0 }],
      [{ node: 'Aguardando Pagto?', type: 'main', index: 0 }],
    ]},
    'Aguardando Pagto?': { main: [
      [{ node: 'Processar Pagto SM', type: 'main', index: 0 }],
      [{ node: 'Aguardando PIX?', type: 'main', index: 0 }],
    ]},
    'Aguardando PIX?': { main: [
      [{ node: 'É SIM (PIX)?', type: 'main', index: 0 }],
      [{ node: 'Identificar Cliente', type: 'main', index: 0 }],  // fallback: reiniciar
    ]},

    'Identificar Cliente': { main: [[{ node: 'Preparar Boas-Vindas', type: 'main', index: 0 }]] },
    'Preparar Boas-Vindas': { main: [[{ node: 'Salvar Estado SM', type: 'main', index: 0 }]] },
    'Processar Nome': { main: [[{ node: 'Salvar Estado SM', type: 'main', index: 0 }]] },
    'Listar Serviços SM': { main: [[{ node: 'Processar Serviço SM', type: 'main', index: 0 }]] },
    'Processar Serviço SM': { main: [[{ node: 'Salvar Estado SM', type: 'main', index: 0 }]] },
    'Processar Data SM': { main: [[{ node: 'Verificar Disp SM', type: 'main', index: 0 }]] },
    'Verificar Disp SM': { main: [[{ node: 'Processar Disponibilidade', type: 'main', index: 0 }]] },
    'Processar Disponibilidade': { main: [[{ node: 'Salvar Estado SM', type: 'main', index: 0 }]] },
    'Processar Pagto SM': { main: [[{ node: 'Gerar PIX?', type: 'main', index: 0 }]] },
    'Gerar PIX?': { main: [
      [{ node: 'Gerar PIX SM', type: 'main', index: 0 }],    // true
      [{ node: 'Criar Sem PIX', type: 'main', index: 0 }],   // false
    ]},
    'Gerar PIX SM': { main: [[{ node: 'Msg PIX SM', type: 'main', index: 0 }]] },
    'Msg PIX SM': { main: [[{ node: 'Salvar Estado SM', type: 'main', index: 0 }]] },
    'Criar Sem PIX': { main: [[{ node: 'Msg Confirmado SM', type: 'main', index: 0 }]] },
    'É SIM (PIX)?': { main: [
      [{ node: 'Criar Após PIX', type: 'main', index: 0 }],          // true: SIM
      [{ node: 'Msg Aguarda Comprovante', type: 'main', index: 0 }], // false: ainda não
    ]},
    'Criar Após PIX': { main: [[{ node: 'Msg Confirmado SM', type: 'main', index: 0 }]] },
    'Msg Aguarda Comprovante': { main: [[{ node: 'Salvar Estado SM', type: 'main', index: 0 }]] },
    'Msg Confirmado SM': { main: [[{ node: 'Limpar Estado SM', type: 'main', index: 0 }]] },
    'Salvar Estado SM': { main: [[{ node: 'Enviar WA SM', type: 'main', index: 0 }]] },
    'Limpar Estado SM': { main: [[{ node: 'Enviar WA SM', type: 'main', index: 0 }]] },
  }

  // Manter: webhook + contexto + WaSender
  const manter = new Set(['webhook-evolution', 'fetch-context', 'buscar-config-wa', 'if-wa-config', 'send-wasender'])
  const idsNovos = new Set(nodes.map(n => n.id))
  const nosFinais = [
    ...wf.nodes.filter(n => manter.has(n.id) && !idsNovos.has(n.id)),
    ...nodes,
  ]

  console.log(`Publicando ${nosFinais.length} nós...`)

  await api(`/workflows/${WF_ID}`, {
    method: 'PUT',
    body: JSON.stringify({ name: wf.name, nodes: nosFinais, connections: conn, settings: { executionOrder: 'v1' } }),
  })

  console.log('✅ State machine publicada com sucesso!')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
