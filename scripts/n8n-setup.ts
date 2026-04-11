/**
 * Synka — N8N Setup Script
 * Atualiza workflow principal (roteamento SIM/NÃO) + cria subfluxo de lembretes.
 * Executar: npx tsx scripts/n8n-setup.ts
 */

const N8N_URL    = process.env.N8N_URL ?? 'https://n8n.somar.ia.br';
const SYNKA_URL  = 'https://synka.somar.ia.br';
const SYNKA_KEY  = 'synka@2026';
const ULTRAMSG_INSTANCE = 'instance168762';
const ULTRAMSG_TOKEN    = process.env.ULTRAMSG_TOKEN ?? 'xp3fx1lj7lsnozzg';
const WORKFLOW_PRINCIPAL = 'qEkpfit2dcWHbYol';

// JWT extraído do N8N_WEBHOOK_URL no .env
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhM2E2ZmRiZS02ZDAzLTQ1ZjAtOGMxMS0xMThlYjc2NjZlOWEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMGE3Mzc2Y2EtNDgyNy00ODU5LThmNWEtNmY0ODBlYTcxZWU4IiwiaWF0IjoxNzc0Mjg0MjUyLCJleHAiOjE3Nzk0MjI0MDB9._RJqKyN5uZmhkjvpho6YQkCpBIdZHvOF_c-VEByyUgQ';

const H = {
  'X-N8N-API-KEY': N8N_KEY,
  'Content-Type': 'application/json',
};

async function api(path: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(`${N8N_URL}/api/v1${path}`, {
    ...opts,
    headers: { ...H, ...(opts?.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`N8N API ${path}: ${res.status} ${txt}`);
  }
  return res.json();
}

// ── Builders ──────────────────────────────────────────────────────────────────

function httpNode(
  id: string, name: string, method: string, url: string, position: [number, number],
  bodyFields?: Record<string, string>
) {
  return {
    id, name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position,
    parameters: {
      method,
      url,
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'x-api-key', value: SYNKA_KEY }],
      },
      ...(bodyFields ? {
        sendBody: true,
        contentType: 'json',
        bodyParameters: {
          parameters: Object.entries(bodyFields).map(([name, value]) => ({ name, value })),
        },
      } : {}),
    },
  };
}

function ultramsgNode(
  id: string, name: string, position: [number, number],
  toExpr: string, bodyExpr: string
) {
  return {
    id, name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position,
    parameters: {
      method: 'POST',
      url: `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`,
      sendBody: true,
      contentType: 'form-urlencoded',
      bodyParameters: {
        parameters: [
          { name: 'token', value: ULTRAMSG_TOKEN },
          { name: 'to',    value: toExpr },
          { name: 'body',  value: bodyExpr },
        ],
      },
    },
  };
}

function ifNode(
  id: string, name: string, position: [number, number],
  leftValue: string, regex: string
) {
  return {
    id, name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position,
    parameters: {
      conditions: {
        options: { caseSensitive: false },
        conditions: [{
          leftValue,
          rightValue: regex,
          operator: { type: 'string', operation: 'regex' },
        }],
      },
    },
  };
}

// ── WORKFLOW PRINCIPAL — adicionar roteamento SIM/NÃO ────────────────────────

async function atualizarWorkflowPrincipal() {
  console.log('\n📖 Lendo workflow principal...');
  const wf = await api(`/workflows/${WORKFLOW_PRINCIPAL}`);
  console.log('Nós atuais:', wf.nodes.map((n: any) => n.name).join(', '));

  const noWebhook = wf.nodes.find((n: any) =>
    n.name.toLowerCase().includes('webhook')
  );
  const noAgente = wf.nodes.find((n: any) =>
    n.type?.includes('agent') || n.name.toLowerCase().includes('agente')
  );

  if (!noWebhook) throw new Error('Nó Webhook não encontrado');
  if (!noAgente)  throw new Error('Nó Agente não encontrado');

  const [wx, wy] = noWebhook.position as [number, number];

  // Novos nós de roteamento
  const TELEFONE_EXPR = "={{ $json.body.telefone ?? $json.telefone ?? '' }}";
  const TENANT_EXPR   = "={{ $json.body.tenantId  ?? $json.tenantId  ?? '' }}";
  const MSG_EXPR      = "={{ $json.body.mensagem  ?? $json.mensagem  ?? $json.body.message ?? '' }}";

  const novosNos = [
    ifNode('router-sim-nao', 'É SIM ou NÃO?', [wx + 240, wy],
      MSG_EXPR, '^(sim|s|yes|confirmo|ok|nao|não|n|no|cancelar)$'),

    ifNode('router-sim', 'É SIM?', [wx + 480, wy - 160],
      MSG_EXPR, '^(sim|s|yes|confirmo|ok)$'),

    httpNode('confirmar-synka', 'Confirmar Agendamento', 'PATCH',
      `${SYNKA_URL}/api/n8n/agenda/confirmar`, [wx + 720, wy - 240],
      { telefone: TELEFONE_EXPR, tenantId: TENANT_EXPR }),

    httpNode('cancelar-synka', 'Cancelar Agendamento', 'PATCH',
      `${SYNKA_URL}/api/n8n/agenda/cancelar-por-telefone`, [wx + 720, wy + 80],
      { telefone: TELEFONE_EXPR, tenantId: TENANT_EXPR, motivo: 'cancelado_pelo_cliente' }),

    ultramsgNode('wa-confirmacao', 'WA: Resposta Confirmação', [wx + 960, wy - 240],
      TELEFONE_EXPR,
      "={{ $json.data?.msgBot ?? 'Agendamento confirmado! ✅' }}"),

    ultramsgNode('wa-cancelamento', 'WA: Resposta Cancelamento', [wx + 960, wy + 80],
      TELEFONE_EXPR,
      "={{ $json.data?.msgBot ?? 'Agendamento cancelado. ❌' }}"),
  ];

  // Remover versões antigas destes nós (idempotente)
  const novosIds = new Set(novosNos.map(n => n.id));
  const nosFiltrados = wf.nodes.filter((n: any) => !novosIds.has(n.id));

  const conexoes = { ...wf.connections };

  // Webhook → Router SIM/NÃO
  conexoes[noWebhook.name] = {
    main: [[{ node: 'É SIM ou NÃO?', type: 'main', index: 0 }]],
  };
  // Router SIM/NÃO: true→Router SIM, false→Agente
  conexoes['É SIM ou NÃO?'] = {
    main: [
      [{ node: 'É SIM?',       type: 'main', index: 0 }],
      [{ node: noAgente.name,  type: 'main', index: 0 }],
    ],
  };
  // Router SIM: true→Confirmar, false→Cancelar
  conexoes['É SIM?'] = {
    main: [
      [{ node: 'Confirmar Agendamento', type: 'main', index: 0 }],
      [{ node: 'Cancelar Agendamento',  type: 'main', index: 0 }],
    ],
  };
  conexoes['Confirmar Agendamento'] = {
    main: [[{ node: 'WA: Resposta Confirmação', type: 'main', index: 0 }]],
  };
  conexoes['Cancelar Agendamento'] = {
    main: [[{ node: 'WA: Resposta Cancelamento', type: 'main', index: 0 }]],
  };

  const payload = {
    name:        wf.name,
    nodes:       [...nosFiltrados, ...novosNos],
    connections: conexoes,
    settings:    { executionOrder: wf.settings?.executionOrder ?? 'v1', callerPolicy: 'workflowsFromSameOwner' },
    staticData:  wf.staticData,
  };

  await api(`/workflows/${WORKFLOW_PRINCIPAL}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  console.log('✅ Workflow principal atualizado com roteamento SIM/NÃO!');
}

// ── SUBFLUXO LEMBRETES ────────────────────────────────────────────────────────

async function criarSubfluxoLembretes() {
  console.log('\n🔔 Criando subfluxo de lembretes...');

  // Verificar se já existe e deletar para recriar (idempotente)
  const lista = await api('/workflows?limit=100');
  const existente = lista.data?.find((w: any) => w.name === 'Synka — Lembretes Automáticos');
  if (existente) {
    console.log(`  ⚠️  Já existe (id: ${existente.id}) — recriando...`);
    await api(`/workflows/${existente.id}`, { method: 'DELETE' });
  }

  const AGENDAMENTO_ID = "={{ $json.agendamentoId ?? $json.id }}";
  const TENANT_ID      = "={{ $json.tenantId }}";

  const wfLembretes = {
    name: 'Synka — Lembretes Automáticos',
    nodes: [
      // Cron 08h Fortaleza (11h UTC)
      {
        id: 'cron-lembretes',
        name: 'Cron 08h Fortaleza',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [200, 300],
        parameters: {
          rule: {
            interval: [{ field: 'cronExpression', expression: '0 11 * * *' }],
          },
        },
      },

      // Buscar pendentes no Synka
      httpNode('buscar-pendentes', 'Buscar Agendamentos Pendentes', 'GET',
        `${SYNKA_URL}/api/cron/lembretes/pendentes`, [450, 300]),

      // SplitInBatches — processa 1 por vez
      {
        id: 'split-loop',
        name: 'Loop Agendamentos',
        type: 'n8n-nodes-base.splitInBatches',
        typeVersion: 3,
        position: [700, 300],
        parameters: { batchSize: 1, options: {} },
      },

      // Montar mensagem
      {
        id: 'montar-msg',
        name: 'Montar Mensagem Lembrete',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [950, 300],
        parameters: {
          assignments: {
            assignments: [
              { id: 'f-tel',  name: 'telefone',     value: '={{ $json.paciente.telefone }}', type: 'string' },
              { id: 'f-tid',  name: 'tenantId',     value: '={{ $json.tenantId }}',          type: 'string' },
              { id: 'f-agid', name: 'agendamentoId', value: '={{ $json.id }}',               type: 'string' },
              {
                id: 'f-msg', name: 'mensagem', type: 'string',
                value:
                  `={{ "Olá " + $json.paciente.nome.split(" ")[0] + "! 👋\\n\\n" +` +
                  `"Lembrando seu agendamento amanhã:\\n\\n" +` +
                  `"📋 " + ($json.servico?.nome ?? "Consulta") + "\\n" +` +
                  `"🕐 " + $json.horario + "\\n" +` +
                  `"🏢 " + $json.clinica + "\\n\\n" +` +
                  `"Para *CONFIRMAR* responda: *SIM*\\n" +` +
                  `"Para *CANCELAR* responda: *NÃO*" }}`,
              },
            ],
          },
        },
      },

      // Enviar via UltraMsg
      ultramsgNode('enviar-lembrete', 'Enviar Lembrete WA', [1200, 300],
        '={{ $json.telefone }}',
        '={{ $json.mensagem }}'),

      // Marcar lembrete enviado
      httpNode('marcar-enviado', 'Marcar Lembrete Enviado', 'PATCH',
        `${SYNKA_URL}/api/n8n/agenda/marcar-lembrete`, [1450, 300],
        { agendamentoId: AGENDAMENTO_ID, tenantId: TENANT_ID }),

      // Delay 3s anti-ban
      {
        id: 'delay-antibam',
        name: 'Delay 3s Anti-ban',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1.1,
        position: [1700, 300],
        parameters: { resume: 'timeInterval', unit: 'seconds', value: 3 },
      },
    ],

    connections: {
      'Cron 08h Fortaleza': {
        main: [[{ node: 'Buscar Agendamentos Pendentes', type: 'main', index: 0 }]],
      },
      'Buscar Agendamentos Pendentes': {
        main: [[{ node: 'Loop Agendamentos', type: 'main', index: 0 }]],
      },
      'Loop Agendamentos': {
        main: [[{ node: 'Montar Mensagem Lembrete', type: 'main', index: 0 }]],
      },
      'Montar Mensagem Lembrete': {
        main: [[{ node: 'Enviar Lembrete WA', type: 'main', index: 0 }]],
      },
      'Enviar Lembrete WA': {
        main: [[{ node: 'Marcar Lembrete Enviado', type: 'main', index: 0 }]],
      },
      'Marcar Lembrete Enviado': {
        main: [[{ node: 'Delay 3s Anti-ban', type: 'main', index: 0 }]],
      },
      'Delay 3s Anti-ban': {
        main: [[{ node: 'Loop Agendamentos', type: 'main', index: 0 }]],
      },
    },

    settings: {
      executionOrder: 'v1',
      saveExecutionProgress: true,
      saveManualExecutions: true,
      callerPolicy: 'workflowsFromSameOwner',
    },
  };

  const criado = await api('/workflows', {
    method: 'POST',
    body: JSON.stringify(wfLembretes),
  });

  await api(`/workflows/${criado.id}/activate`, { method: 'POST' });
  console.log(`✅ Subfluxo criado e ativado! ID: ${criado.id}`);
  return criado.id;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Synka N8N Setup iniciando...');
  console.log(`   Synka: ${SYNKA_URL}`);
  console.log(`   N8N:   ${N8N_URL}`);

  try {
    await atualizarWorkflowPrincipal();
    const lembreteId = await criarSubfluxoLembretes();

    console.log('\n✅ Setup completo!');
    console.log('\nResultado:');
    console.log(`  • Workflow principal (${WORKFLOW_PRINCIPAL}): roteamento SIM/NÃO adicionado`);
    console.log(`  • Subfluxo lembretes: id=${lembreteId}`);
    console.log('\nPróximos passos:');
    console.log('  1. Verificar workflows no painel n8n');
    console.log('  2. Executar teste manual do subfluxo');
    console.log('  3. Enviar SIM/NÃO pelo WhatsApp para testar roteamento');
  } catch (err: any) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

main();
