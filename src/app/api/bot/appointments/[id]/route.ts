import { NextRequest } from 'next/server';
import { PATCH as cancelarAgenda, POST as cancelarAgendaPost } from '@/app/api/n8n/agenda/cancelar/route';

/**
 * ALIAS COMPATIBILIDADE N8N ANTIGO
 * /api/bot/appointments/[id] -> /api/n8n/agenda/cancelar
 */

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = req.nextUrl.clone();
  url.searchParams.set('id', params.id);
  const newReq = new NextRequest(url, req);
  return cancelarAgenda(newReq);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = req.nextUrl.clone();
  url.searchParams.set('id', params.id);
  const newReq = new NextRequest(url, req);
  return cancelarAgenda(newReq);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = req.nextUrl.clone();
  url.searchParams.set('id', params.id);
  const newReq = new NextRequest(url, req);
  return cancelarAgendaPost(newReq);
}
