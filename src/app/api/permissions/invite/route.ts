import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';
import { enviarConviteUsuario } from '@/lib/emails';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  recepcao: 'Recepção',
  profissional: 'Profissional',
  temporario: 'Colaborador Temporário',
};

/**
 * POST /api/permissions/invite
 * Cria convite e envia por email e/ou WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await getSessionInfo();
    const body = await req.json();
    const { nome, email, telefone, role, profissionalId } = body;

    if (!nome || !role) {
      return Response.json({ error: 'nome e role são obrigatórios' }, { status: 400 });
    }
    if (!email && !telefone) {
      return Response.json({ error: 'email ou telefone é obrigatório' }, { status: 400 });
    }

    // Verificar duplicata por email
    if (email) {
      const existe = await prisma.usuario.findFirst({ where: { tenantId, email } });
      if (existe) {
        return Response.json(
          { error: 'Já existe um usuário cadastrado com esse email' },
          { status: 400 }
        );
      }
    }

    const expirarEm = new Date(Date.now() + 7 * 24 * 3600000);

    const convite = await prisma.convite.create({
      data: {
        tenantId,
        nome,
        email: email ?? null,
        telefone: telefone ?? null,
        role,
        profissionalId: profissionalId ?? null,
        criadoPor: userId,
        expirarEm,
      },
    });

    const clinica = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { nome: true },
    });

    const link = `${process.env.NEXT_PUBLIC_APP_URL}/convite/${convite.token}`;

    // Enviar email
    if (email) {
      try {
        await enviarConviteUsuario({
          email,
          nome,
          nomeClinica: clinica?.nome ?? 'a clínica',
          role: ROLE_LABEL[role] ?? role,
          link,
          expirarEm,
        });
      } catch (e) {
        console.error('[invite] erro email:', e);
      }
    }

    // Enviar WhatsApp
    if (telefone) {
      try {
        const { sendAndLog } = await import('@/lib/marketing-helpers');
        const msg =
          `Olá, ${nome}!\n\n` +
          `Você foi convidado para acessar o sistema da *${clinica?.nome ?? 'clínica'}*.\n\n` +
          `Função: *${ROLE_LABEL[role] ?? role}*\n\n` +
          `Acesse o link para criar sua senha:\n${link}\n\n` +
          `O link expira em 7 dias.`;
        await sendAndLog({
          tenantId,
          tipo: 'convite_usuario',
          clienteNome: nome,
          clienteTelefone: telefone,
          mensagemEnviada: msg,
          forcarHorario: true,
          ignorarRisco: true,
        });
      } catch (e) {
        console.error('[invite] erro whatsapp:', e);
      }
    }

    return Response.json({ ok: true, conviteId: convite.id, link });
  } catch (err) {
    console.error('[permissions/invite POST]', err);
    return Response.json({ error: 'Erro ao criar convite' }, { status: 500 });
  }
}

/**
 * DELETE /api/permissions/invite?id=...
 * Cancela convite pendente.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 });

    await prisma.convite.update({
      where: { id, tenantId },
      data: { status: 'cancelado' },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[permissions/invite DELETE]', err);
    return Response.json({ error: 'Erro ao cancelar convite' }, { status: 500 });
  }
}
