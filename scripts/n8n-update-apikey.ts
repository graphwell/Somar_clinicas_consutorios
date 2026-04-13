/**
 * Atualiza N8N_API_KEY em todos os nós HTTP que chamam o Synka.
 *
 * Variáveis necessárias no .env:
 *   N8N_API_KEY_N8N  — chave gerada pelo próprio N8N (Settings → API)
 *   N8N_API_KEY      — nova chave que o Synka espera receber
 *
 * Executar: npx tsx scripts/n8n-update-apikey.ts
 */

const N8N_URL = process.env.N8N_HOST ?? 'https://n8n.somar.ia.br';
const N8N_API_KEY = process.env.N8N_API_KEY_N8N;
const SYNKA_NEW_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error(
    'Defina N8N_API_KEY_N8N no .env\n' +
    '(chave gerada pelo próprio N8N em Settings → API)'
  );
  process.exit(1);
}

if (!SYNKA_NEW_KEY) {
  console.error(
    'Defina N8N_API_KEY no .env\n' +
    '(nova senha que você definiu para o Synka)'
  );
  process.exit(1);
}

const H: Record<string, string> = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json',
};

async function api(path: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(`${N8N_URL}/api/v1${path}`, {
    ...opts,
    headers: { ...H, ...(opts?.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${path}: HTTP ${res.status} — ${text}`);
  }
  return res.json();
}

function atualizarNo(no: any): { no: any; alterado: boolean; motivos: string[] } {
  const motivos: string[] = [];

  if (no.type !== 'n8n-nodes-base.httpRequest') {
    return { no, alterado: false, motivos };
  }

  const url: string = no.parameters?.url ?? '';
  const urlLower = url.toLowerCase();
  const chamasSynka =
    urlLower.includes('synka.somar.ia.br') ||
    urlLower.includes('somar-clinicas-consutorios.vercel.app') ||
    urlLower.includes('somar_clinicas');

  if (!chamasSynka) {
    return { no, alterado: false, motivos };
  }

  const noAtualizado = JSON.parse(JSON.stringify(no));
  let alterado = false;

  // ── 1. URL com vercel preview → produção ───────────────────────────────
  if (noAtualizado.parameters?.url?.includes('somar-clinicas-consutorios.vercel.app')) {
    noAtualizado.parameters.url = noAtualizado.parameters.url.replace(
      /somar-clinicas-consutorios\.vercel\.app/g,
      'synka.somar.ia.br'
    );
    alterado = true;
    motivos.push('URL: vercel.app → synka.somar.ia.br');
  }

  // ── 2. Header x-api-key em headerParameters ────────────────────────────
  const headerParams: any[] =
    noAtualizado.parameters?.headerParameters?.parameters ?? [];

  for (const h of headerParams) {
    if (
      typeof h.name === 'string' &&
      h.name.toLowerCase() === 'x-api-key'
    ) {
      const old = h.value;
      if (old !== '={{ $env.N8N_API_KEY }}') {
        h.value = '={{ $env.N8N_API_KEY }}';
        alterado = true;
        motivos.push(`header x-api-key: "${old}" → $env.N8N_API_KEY`);
      }
    }
  }

  // ── 3. Header x-api-key em sendHeaders (estrutura alternativa) ─────────
  const sendHeaders: any[] =
    noAtualizado.parameters?.options?.headers?.values ?? [];

  for (const h of sendHeaders) {
    if (
      typeof h.name === 'string' &&
      h.name.toLowerCase() === 'x-api-key'
    ) {
      const old = h.value;
      if (old !== '={{ $env.N8N_API_KEY }}') {
        h.value = '={{ $env.N8N_API_KEY }}';
        alterado = true;
        motivos.push(`sendHeaders x-api-key: "${old}" → $env.N8N_API_KEY`);
      }
    }
  }

  // ── 4. _key hardcoded em URLs expressão ────────────────────────────────
  // Padrão: "?_key=synka@2026&" ou "?_key=VALOR&"
  const urlExpr: string = noAtualizado.parameters?.url ?? '';
  if (urlExpr.includes('_key=') && !urlExpr.includes('$env.N8N_API_KEY')) {
    noAtualizado.parameters.url = urlExpr.replace(
      /\?_key=[^&"\\]+/g,
      '?_key=\" + $env.N8N_API_KEY + \"'
    );
    alterado = true;
    motivos.push('URL query param _key → $env.N8N_API_KEY');
  }

  return { no: noAtualizado, alterado, motivos };
}

async function atualizarWorkflow(wf: any): Promise<number> {
  console.log(`\n📋 Workflow: "${wf.name}" (${wf.id})`);

  if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) {
    console.log('   (sem nós)');
    return 0;
  }

  let totalAlterado = 0;
  const nosAtualizados = wf.nodes.map((no: any) => {
    const { no: noAtualizado, alterado, motivos } = atualizarNo(no);
    if (alterado) {
      totalAlterado++;
      console.log(`   ✏️  Nó: "${no.name}"`);
      motivos.forEach(m => console.log(`      → ${m}`));
    }
    return noAtualizado;
  });

  if (totalAlterado === 0) {
    console.log('   ✅ Nenhuma alteração necessária');
    return 0;
  }

  await api(`/workflows/${wf.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...wf, nodes: nosAtualizados }),
  });

  console.log(`   ✅ ${totalAlterado} nó(s) atualizado(s) e salvo(s)`);
  return totalAlterado;
}

async function garantirVariavel(): Promise<void> {
  console.log('\n🔧 Verificando variável N8N_API_KEY no N8N...');
  try {
    const vars = await api('/variables');
    const lista: any[] = vars.data ?? vars ?? [];
    const varExiste = lista.find((v: any) => v.key === 'N8N_API_KEY');

    if (varExiste) {
      await api(`/variables/${varExiste.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ value: SYNKA_NEW_KEY }),
      });
      console.log('✅ Variável N8N_API_KEY atualizada com novo valor!');
    } else {
      await api('/variables', {
        method: 'POST',
        body: JSON.stringify({
          key: 'N8N_API_KEY',
          value: SYNKA_NEW_KEY,
          type: 'string',
        }),
      });
      console.log('✅ Variável N8N_API_KEY criada!');
    }
  } catch (err: any) {
    console.warn('⚠️  Não foi possível atualizar variável via API:', err.message);
    console.warn(
      `   Adicione manualmente no N8N:\n` +
      `   Settings → Variables → N8N_API_KEY = ${SYNKA_NEW_KEY}`
    );
  }
}

async function main(): Promise<void> {
  console.log('🔑 Synka — Atualizar API Key no N8N');
  console.log(`   N8N URL : ${N8N_URL}`);
  console.log(`   Nova chave Synka: $env.N8N_API_KEY (valor do .env)`);

  // Testar conectividade
  try {
    await api('/workflows?limit=1');
  } catch (err: any) {
    console.error('\n❌ Não foi possível conectar ao N8N:', err.message);
    console.error('   Verifique N8N_API_KEY_N8N e se o N8N está acessível.');
    process.exit(1);
  }

  // Listar todos os workflows
  const { data: workflows } = await api('/workflows?limit=100');
  console.log(`\n📦 ${workflows.length} workflow(s) encontrado(s)`);

  let totalNosAlterados = 0;
  for (const wf of workflows) {
    const wfCompleto = await api(`/workflows/${wf.id}`);
    totalNosAlterados += await atualizarWorkflow(wfCompleto);
  }

  await garantirVariavel();

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Concluído — ${totalNosAlterados} nó(s) total atualizado(s)`);
  console.log('\nPróximos passos:');
  console.log('  1. Verificar workflows no painel N8N');
  console.log('  2. Confirmar que CRON_SECRET e ADMIN_SECRET estão na Vercel');
  console.log('  3. Testar enviando mensagem no WhatsApp');
  console.log('  4. Monitorar execuções no N8N por 10 minutos');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
