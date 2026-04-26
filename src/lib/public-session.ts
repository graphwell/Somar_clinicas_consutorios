import { SignJWT, jwtVerify } from 'jose';

export interface SessaoPublica {
  pacienteId: string;
  tenantId:   string;
  slug:       string;
  tipo:       'public_session'; // guard obrigatório — nunca aceitar outros tipos
}

function getSecret(): Uint8Array {
  const secret = process.env.PUBLIC_SESSION_SECRET ?? process.env.JWT_SECRET ?? '';
  if (!secret) throw new Error('PUBLIC_SESSION_SECRET não configurado.');
  return new TextEncoder().encode(secret);
}

export async function gerarTokenPublico(
  payload: Omit<SessaoPublica, 'tipo'>,
  expiresIn = '24h',
): Promise<string> {
  return new SignJWT({ ...payload, tipo: 'public_session' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verificarSessaoPublica(
  request: Request,
): Promise<SessaoPublica | null> {
  try {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    if (payload['tipo'] !== 'public_session') return null;

    return payload as unknown as SessaoPublica;
  } catch {
    return null;
  }
}
