// @ts-ignore
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET não está configurado nas variáveis de ambiente.');
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  profissionalId?: string;
  acessoExpiraEm?: string; // ISO string para temporários
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Kept for backwards compat — always returns empty string (use signToken)
export function generateToken(_payload: AuthPayload): string {
  return '';
}

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
  } catch {
    return null;
  }
}
