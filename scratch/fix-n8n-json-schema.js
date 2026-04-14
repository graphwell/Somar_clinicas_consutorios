const fs = require('fs');

async function fixJson() {
  const filePath = 'n8n/ai-agent-dynamic-flow.json';
  const content = fs.readFileSync(filePath, 'utf8');
  let workflow = JSON.parse(content);

  workflow.nodes = workflow.nodes.map(node => {
    // Apenas nós do tipo @n8n/n8n-nodes-langchain.toolHttpRequest precisam do ajuste de schema
    if (node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
      const p = node.parameters;

      // 1. Converter Query
      if (p.queryParameters && p.queryParameters.parameters) {
        p.parametersQuery = {
          values: p.queryParameters.parameters.map(param => ({
            name: param.name,
            value: param.value
          }))
        };
        delete p.queryParameters;
      }

      // 2. Converter Headers
      if (p.headerParameters && p.headerParameters.parameters) {
        p.parametersHeaders = {
          values: p.headerParameters.parameters.map(param => ({
            name: param.name,
            value: param.value
          }))
        };
        delete p.headerParameters;
      }

      // 3. Converter Body
      if (p.bodyParameters && p.bodyParameters.parameters) {
        p.parametersBody = {
          values: p.bodyParameters.parameters.map(param => ({
            name: param.name,
            value: param.value
          }))
        };
        delete p.bodyParameters;
      }
    }
    return node;
  });

  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  console.log('JSON refatorado com sucesso para o schema do servidor!');
}

fixJson().catch(console.error);
