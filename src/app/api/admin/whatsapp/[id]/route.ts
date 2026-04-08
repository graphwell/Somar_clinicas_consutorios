import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, INSTANCE_SELECT } from '@/lib/wasender';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, empresaId: true },
  });

  if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

  // MODO MASTER: Ignora travas de empresaId ou status técnico e deleta permanentemente.
  try {
    await prisma.whatsappInstance.delete({
      where: { id: params.id },
    });
    console.log(`[Admin API] Instância ${params.id} excluída com sucesso por admin.`);
    return NextResponse.json({ success: true, mensagem: 'Instância removida permanentemente do pool' });
  } catch (err: any) {
    console.error(`[Admin API] ERRO AO EXCLUIR INSTÂNCIA ${params.id}:`, err.message);
    
    // Se for erro de restrição de chave estrangeira
    if (err.code === 'P2003') {
      return NextResponse.json(
        { error: 'Não é possível excluir esta instância porque ela possui registros vinculados em outras tabelas (Logs, Marketing, etc). Limpe as referências antes de excluir.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: `Erro técnico ao excluir: ${err.message}` },
      { status: 500 }
    );
  }
}
