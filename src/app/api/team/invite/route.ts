import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, role, tenantId } = await request.json();

    if (!email || !role || !tenantId) {
      return NextResponse.json({ error: 'email, role e tenantId são obrigatórios.' }, { status: 400 });
    }
    if (!['admin', 'recepcao'].includes(role)) {
      return NextResponse.json({ error: 'role inválido.' }, { status: 400 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas

    await prisma.inviteToken.create({ data: { token, email, role, tenantId, expiresAt } });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://somar-clinicas-consutorios.vercel.app';
    const inviteLink = `${appUrl}/aceitar-convite?token=${token}`;

    await resend.emails.send({
      from: 'Somar.IA <noreply@somar.ia.br>',
      to: email,
      subject: 'Você foi convidado para a Somar.IA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #050510; color: #f0f0f5; border-radius: 16px; padding: 40px;">
          <h1 style="font-size: 28px; margin-bottom: 8px;">Bem-vindo à <span style="color: #8080ff;">Somar.IA</span>!</h1>
          <p style="color: #a0a0b0;">Você foi convidado como <strong>${role === 'admin' ? 'Administrador' : 'Atendente'}</strong> de uma clínica na Somar.IA.</p>
          <p style="color: #a0a0b0;">Clique no botão abaixo para aceitar o convite e criar sua conta. O link expira em 72 horas.</p>
          <a href="${inviteLink}" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #4a4ae2; color: white; border-radius: 12px; text-decoration: none; font-weight: bold;">
            Aceitar Convite
          </a>
          <hr style="border: none; border-top: 1px solid #1a1a30; margin: 32px 0;" />
          <p style="color: #606080; font-size: 12px;">© 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: `Convite enviado para ${email}` });
  } catch (error) {
    console.error('[TEAM_INVITE_ERROR]', error);
    return NextResponse.json({ error: 'Erro interno ao enviar convite.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token não informado.' }, { status: 400 });

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Convite inválido ou expirado.' }, { status: 404 });
  }
  return NextResponse.json({ email: invite.email, role: invite.role, tenantId: invite.tenantId });
}
