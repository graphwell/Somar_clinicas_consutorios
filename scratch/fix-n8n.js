const fs = require('fs');
const file = 'c:/SOMAR/projeto-somar-n8n/n8n/ai-agent-dynamic-flow.json';
let content = fs.readFileSync(file, 'utf8');

// The single quotes do not need escaping in JSON
content = content.replace(/\+ synka132504fE@ \+/g, "+ 'synka132504fE@' +");

fs.writeFileSync(file, content, 'utf8');

try {
  JSON.parse(content);
  console.log('Fixed syntax successfully and JSON is valid!');
} catch(e) {
  console.error('Invalid JSON:', e);
}
