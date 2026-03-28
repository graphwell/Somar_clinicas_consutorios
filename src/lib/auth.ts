// @ts-ignore
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// Segredo fixo para garantir consistência entre Node.js e Edge Runtime
const JWT_SECRET = 'somar-ia-super-secret-key-mudar-em-producao';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  profissionalId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Geração de token usando jose (compatível com Edge e Node)
export function generateToken(payload: AuthPayload): string {
  // Nota: No jose, a assinatura é assíncrona se usar SignJWT.sign(). 
  // Mas para manter compatibilidade síncrona nos controllers, 
  // podemos usar uma abordagem que funcione ou mudar para async.
  // Vamos mudar para async para garantir segurança total.
  return ""; // Placeholder para evitar erro de tipo até reescrita completa
}

// Reescrita assíncrona para compatibilidade total
export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as AuthPayload;
  } catch (error) {
    console.error('Jose Verification Error:', error);
    return null;
  }
}
