const fs = require('fs');
const file = 'n8n/ai-agent-dynamic-flow.json';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  /\$\('Webhook WhatsApp'\)\.item\.json\.body\.message\s*\|\|\s*\$\('Webhook WhatsApp'\)\.item\.json\.message/g, 
  "$('Webhook WhatsApp').item.json.body.mensagem || $('Webhook WhatsApp').item.json.mensagem"
);

data = data.replace(
  /\$\('Webhook WhatsApp'\)\.item\.json\.sender_number/g, 
  "($('Webhook WhatsApp').item.json.body.telefone || $('Webhook WhatsApp').item.json.telefone)"
);

data = data.replace(
  /\$\('Webhook WhatsApp'\)\.item\.json\.body\.from/g, 
  "($('Webhook WhatsApp').item.json.body.telefone || $('Webhook WhatsApp').item.json.telefone)"
);

fs.writeFileSync(file, data);
console.log("Updated flow parameters");
