import jwt from 'jsonwebtoken';
// @ts-ignore
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'somar-ia-super-secret-key-mudar-em-producao';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
