const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'somar-ia-secret-key-change-me';
console.log('JWT_SECRET Lenght:', secret.length);

const payload = { userId: '123', email: 'test@test.com', role: 'admin', tenantId: 'test-tenant' };
const token = jwt.sign(payload, secret);
console.log('Token Gerado com sucesso.');

try {
  const verified = jwt.verify(token, secret);
  console.log('Verificação Interna: OK');
} catch (e) {
  console.error('Verificação Interna: FALHOU', e.message);
}

// Simular o que o auth.ts faria se o env sumisse
const fallbackSecret = 'somar-ia-secret-key-change-me';
try {
  jwt.verify(token, fallbackSecret);
  console.log('Verificação com Fallback: OK (Isso é RUIM se o env deveria estar lá)');
} catch (e) {
  console.log('Verificação com Fallback: FALHOU (Isso é BOM, significa que o segredo real é diferente)');
}
