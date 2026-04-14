import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { enviarVerificacaoEmail } from '@/lib/emails';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, senha, nomeClinica, nomeResponsavel, nome, sobrenome, telefone } = await request.json();

    // --- Validações ---
    const nomeFinal = nome || nomeResponsavel;
    if (!nomeFinal || nomeFinal.trim().length < 2) {
      return NextResponse.json({ error: 'Nome é obrigatório (mínimo 2 caracteres).' }, { status: 400 });
    }
    if (sobrenome !== undefined && sobrenome !== null && sobrenome.trim().length > 0 && sobrenome.trim().length < 2) {
      return NextResponse.json({ error: 'Sobrenome deve ter pelo menos 2 caracteres.' }, { status: 400 });
    }
    if (telefone) {
      const telLimpo = telefone.replace(/\D/g, '');
      if (telLimpo.length < 10 || telLimpo.length > 11) {
        return NextResponse.json({ error: 'Telefone inválido. Use formato (XX) XXXXX-XXXX.' }, { status: 400 });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 400 });
    }

    if (!senha || senha.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }
    if (!/[A-Z]/.test(senha)) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos uma letra maiúscula.' }, { status: 400 });
    }
    if (!/[0-9]/.test(senha)) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos um número.' }, { status: 400 });
    }

    if (!nomeClinica || nomeClinica.trim().length < 2) {
      return NextResponse.json({ error: 'Nome da clínica é obrigatório.' }, { status: 400 });
    }

    // --- Criar clínica + usuário ---
    const tenantId = `tenant_${randomUUID().substring(0, 8)}`;
    const slug = nomeClinica.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') || 'clinica';
    const senhaHash = await hashPassword(senha);

    const result = await prisma.$transaction(async (tx) => {
      const clinica = await tx.clinica.create({
        data: {
          tenantId,
          nome: nomeClinica,
          slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
          onboardingCompleted: false,
        },
      });
      const usuario = await tx.usuario.create({
        data: {
          nome: nomeFinal.trim(),
          sobrenome: sobrenome?.trim() || null,
          telefone: telefone?.replace(/\D/g, '') || null,
          email,
          senhaHash,
          role: 'admin',
          tenantId: clinica.tenantId,
          emailVerificado: false,
          primeiroAcesso: true,
        },
      });
      await tx.marketingConfig.create({ data: { tenantId: clinica.tenantId } });

      return { usuario, clinica };
    });

    // --- Gerar token de verificação e enviar email ---
    const verToken = randomUUID();
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificacao.create({
      data: { email, token: verToken, expiraEm },
    });

    enviarVerificacaoEmail(email, nomeFinal.trim(), verToken).catch((err) =>
      console.error('[REGISTER] Email error:', err)
    );

    return NextResponse.json({
      success: true,
      message: 'Conta criada! Verifique seu email para ativar o acesso.',
      email,
    });
  } catch (error: any) {
    console.error('[AUTH_REGISTER_ERROR]:', error.message);
    return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 });
  }
}
