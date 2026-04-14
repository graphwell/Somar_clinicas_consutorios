const fs = require('fs');

async function updateN8n() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhM2E2ZmRiZS02ZDAzLTQ1ZjAtOGMxMS0xMThlYjc2NjZlOWEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMGE3Mzc2Y2EtNDgyNy00ODU5LThmNWEtNmY0ODBlYTcxZWU4IiwiaWF0IjoxNzc0Mjg0MjUyLCJleHAiOjE3Nzk0MjI0MDB9._RJqKyN5uZmhkjvpho6YQkCpBIdZHvOF_c-VEByyUgQ';
  const workflowId = 'qEkpfit2dcWHbYol';
  const baseUrl = 'https://n8n.somar.ia.br/api/v1/workflows';
  const headers = { 'X-N8N-API-KEY': token, 'Content-Type': 'application/json' };

  console.log('--- Buscando workflow atual do servidor ---');
  const serverRes = await fetch(`${baseUrl}/${workflowId}`, { headers });
  if (!serverRes.ok) throw new Error(`Erro ao buscar workflow: ${serverRes.statusText}`);
  const serverWorkflow = await serverRes.json();

  console.log('--- Lendo arquivo local ---');
  const localFile = fs.readFileSync('n8n/ai-agent-dynamic-flow.json', 'utf8');
  const localWorkflow = JSON.parse(localFile);

  // Mapear credenciais existentes por nome de nó
  const credsMap = {};
  serverWorkflow.nodes.forEach(node => {
    if (node.credentials) credsMap[node.name] = node.credentials;
  });

  // Atualizar nós locais com as credenciais do servidor
  const updatedNodes = localWorkflow.nodes.map(node => {
    if (credsMap[node.name]) {
      console.log(`Preservando credenciais para o nó: ${node.name}`);
      return { ...node, credentials: credsMap[node.name] };
    }
    return node;
  });

  const payload = {
    name: localWorkflow.name,
    nodes: updatedNodes,
    connections: localWorkflow.connections,
    settings: localWorkflow.settings || {}
  };

  console.log('--- Enviando atualização ---');
  const updateRes = await fetch(`${baseUrl}/${workflowId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });

  if (!updateRes.ok) {
    const errorBody = await updateRes.text();
    throw new Error(`Erro no update: ${updateRes.statusText} - ${errorBody}`);
  }

  console.log('--- Workflow atualizado com sucesso! ---');

  // Ativar o workflow
  console.log('--- Ativando workflow ---');
  const activateRes = await fetch(`${baseUrl}/${workflowId}/activate`, { method: 'POST', headers });
  if (activateRes.ok) {
    console.log('--- Workflow Ativado! ---');
  } else {
    console.log('--- Falha ao ativar (pode já estar ativo) ---');
  }
}

updateN8n().catch(console.error);
