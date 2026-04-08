import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin } from '@/lib/wasender';
import { WhatsAppProvider } from '@/lib/whatsapp-provider';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { id: params.id },
    select: { id: true, bearerToken: true, sessionId: true, plataforma: true, status: true, empresaId: true, numeroWa: true, conectadoEm: true },
  });

  if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

  const live = await WhatsAppProvider.getStatus(instancia.plataforma, instancia.sessionId, instancia.bearerToken);

  // Inteligência de Sincronização
  let novoStatus = instancia.status;
  
  if (!live.conectado) {
    // Se não está conectado na API, marcamos como OFFLINE se não for DEMO
    if (instancia.status !== 'DEMO') novoStatus = 'OFFLINE';
  } else {
    // Se está conectado e estava OFFLINE ou AGUARDANDO, restauramos o status correto
    if (instancia.status === 'OFFLINE' || instancia.status === 'AGUARDANDO' || instancia.status === 'LIVRE' || instancia.status === 'EM_USO') {
        novoStatus = instancia.empresaId ? 'EM_USO' : 'LIVRE';
    }
  }

  const updated = await prisma.whatsappInstance.update({
    where: { id: params.id },
    data: { 
      ultimoPing: new Date(),
      status: novoStatus,
      numeroWa: live.numero || instancia.numeroWa,
      conectadoEm: live.conectado ? (instancia.conectadoEm || new Date()) : null,
    },
  });

  return NextResponse.json({
    success: true,
    conectado: live.conectado,
    numero: live.numero,
    statusFinal: novoStatus,
    statusProvedor: live.statusRaw,
  });
}
