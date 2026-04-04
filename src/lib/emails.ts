import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'Synka <noreply@synka.com.br>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://synka.somar.ia.br';

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2D6A4F,#40916C);padding:32px 40px;text-align:center;">
      <p style="color:rgba(255,255,255,0.9);font-size:22px;font-weight:700;margin:0;letter-spacing:-0.5px;">Synka</p>
      <p style="color:rgba(255,255,255,0.55);font-size:11px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">by Somar.ia</p>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:20px 40px;background:#F5F0E8;text-align:center;border-top:1px solid #EEE9DF;">
      <p style="color:#8A9BB0;font-size:11px;margin:0;">© 2025 SOMMAR SOLUÇÕES DIGITAIS · CNPJ: 65.771.133/0001-07</p>
      <p style="color:#8A9BB0;font-size:11px;margin:4px 0 0;">Se você não solicitou este email, pode ignorá-lo com segurança.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function enviarVerificacaoEmail(
  email: string,
  nome: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/api/auth/verificar-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Confirme seu email — Synka',
    html: baseTemplate(`
      <h2 style="color:#1B2B3A;font-size:22px;margin:0 0 12px;">Olá, ${nome}! 👋</h2>
      <p style="color:#4A6480;line-height:1.7;font-size:15px;margin:0 0 32px;">
        Você está a um passo de começar a usar o Synka. Confirme seu endereço de email para ativar sua conta.
      </p>
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${link}"
           style="display:inline-block;background:linear-gradient(135deg,#40916C,#2D6A4F);color:#fff;
                  padding:15px 36px;border-radius:10px;text-decoration:none;font-weight:600;
                  font-size:15px;letter-spacing:-0.2px;">
          Confirmar email ✓
        </a>
      </div>
      <p style="color:#8A9BB0;font-size:13px;text-align:center;margin:0;">
        Link válido por <strong>24 horas</strong>.
      </p>
    `),
  });
}

export async function enviarConviteProfissional(
  email: string,
  nomeConvidado: string,
  nomeClinica: string,
  nomeAdmin: string,
  role: string,
  token: string,
  expiraEm: Date
): Promise<void> {
  const link = `${APP_URL}/aceitar-convite?token=${token}`;
  const roleLabel: Record<string, string> = {
    recepcao: 'Recepcionista',
    profissional: 'Profissional de Saúde',
    temporario: 'Colaborador Temporário',
    admin: 'Administrador',
  };
  const label = roleLabel[role] || role;
  const expiraStr = expiraEm.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Você foi convidado para ${nomeClinica} — Synka`,
    html: baseTemplate(`
      <h2 style="color:#1B2B3A;font-size:22px;margin:0 0 12px;">Você foi convidado! 🎉</h2>
      <p style="color:#4A6480;line-height:1.7;font-size:15px;margin:0 0 20px;">
        <strong>${nomeAdmin}</strong> convidou você para fazer parte da equipe da clínica
        <strong>${nomeClinica}</strong> no Synka.
      </p>
      <div style="background:#F5F0E8;border-radius:12px;padding:16px 20px;margin:0 0 28px;">
        <p style="margin:0 0 6px;font-size:13px;color:#8A9BB0;">Função</p>
        <p style="margin:0;font-size:16px;font-weight:600;color:#1B2B3A;">${label}</p>
      </div>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${link}"
           style="display:inline-block;background:linear-gradient(135deg,#40916C,#2D6A4F);color:#fff;
                  padding:15px 36px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
          Aceitar convite →
        </a>
      </div>
      <p style="color:#8A9BB0;font-size:12px;text-align:center;margin:0;">
        Convite válido até <strong>${expiraStr}</strong>.
      </p>
    `),
  });
}

export async function enviarResetSenha(
  email: string,
  nome: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/auth/reset-senha?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Redefinir sua senha — Synka',
    html: baseTemplate(`
      <h2 style="color:#1B2B3A;font-size:22px;margin:0 0 12px;">Redefinir senha</h2>
      <p style="color:#4A6480;line-height:1.7;font-size:15px;margin:0 0 12px;">
        Olá, <strong>${nome}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta Synka.
      </p>
      <p style="color:#4A6480;line-height:1.7;font-size:15px;margin:0 0 32px;">
        Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
      </p>
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${link}"
           style="display:inline-block;background:linear-gradient(135deg,#40916C,#2D6A4F);color:#fff;
                  padding:15px 36px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
          Redefinir senha
        </a>
      </div>
      <p style="color:#E05C5C;font-size:13px;text-align:center;margin:0;">
        ⚠️ Se você não solicitou isso, ignore este email. Sua senha permanece a mesma.
      </p>
    `),
  });
}
