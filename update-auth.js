const fs = require('fs');

function fixAuth(file) {
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  data.nodes.forEach(node => {
     if (node.type === 'n8n-nodes-base.httpRequest' || node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        // Ignora webhook disparador
        if (node.name.includes('Whatsapp') || node.name.includes('Disparar')) {
           // WaSenderAPI/UltraMsg disparos — a gente não injeta a API key do Synka aqui
           return;
        }
        
        // Remove headerAuth quebrado
        delete node.parameters.authentication;
        
        // Injeta sendHeaders com a nova senha
        node.parameters.sendHeaders = true;
        if (!node.parameters.headerParameters) {
            node.parameters.headerParameters = { parameters: [] };
        }
        
        const existing = node.parameters.headerParameters.parameters.find(p => p.name === 'x-api-key');
        if (existing) {
            existing.value = 'synka@2026';
        } else {
            node.parameters.headerParameters.parameters.push({
                name: 'x-api-key',
                value: 'synka@2026'
            });
        }
     }
  });

  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Atualizado ${file} com sucesso.`);
}

fixAuth('n8n/ai-agent-dynamic-flow.json');
