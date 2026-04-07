import { NextRequest, NextResponse } from 'next/server';
import { GET as buscarCliente } from '@/app/api/n8n/cliente/buscar/route';
import { POST as criarAgenda } from '@/app/api/n8n/agenda/criar/route';

/**
 * ALIAS COMPATIBILIDADE N8N ANTIGO
 * Redireciona /api/bot/appointments para /api/n8n/...
 * O middleware auth x-api-key já atua se o n8n enviar, 
 * mas delegamos o Request pro novo handler.
 */

export async function GET(req: NextRequest) {
  // Ajuste de 'phone' -> 'telefone' pro novo endpoint
  const url = req.nextUrl.clone();
  const phone = url.searchParams.get('phone');
  if (phone) url.searchParams.set('telefone', phone);

  // Chama o handler novo simulando o request
  const newReq = new NextRequest(url, req);
  return buscarCliente(newReq);
}

export async function POST(req: NextRequest) {
  // O endpoint criar/route já cuida do mapimento fallback (nome -> clienteNome, etc)
  return criarAgenda(req);
}
