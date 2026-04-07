// Alias: /api/bot/availability → /api/n8n/agenda/disponibilidade
// A versão antiga calculava slots simples de 1h sem considerar escalas/serviços.
// A nova versão usa a lógica completa (timezone Fortaleza, buffer, almoço, por profissional).
// Parâmetros esperados: ?slug=xxx&servicoId=xxx&data=YYYY-MM-DD[&profissionalId=xxx]
export { GET } from '@/app/api/n8n/agenda/disponibilidade/route';
