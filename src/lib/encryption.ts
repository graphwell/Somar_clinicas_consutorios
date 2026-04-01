import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Retorna e valida a chave de criptografia (obrigatório 32 bytes)
 */
function getKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('CONFIG ERROR: ENCRYPTION_KEY is required in environment variables.');
  }
  
  const key = Buffer.from(keyStr, 'utf-8');
  if (key.length !== 32) {
    throw new Error('CONFIG ERROR: ENCRYPTION_KEY must be exactly 32 bytes long for AES-256-GCM.');
  }

  return key;
}

/**
 * Criptografa strings utilizando AES-256-GCM
 * @returns {string} iv:authTag:ciphertext (base64)
 */
export function encrypt(text: string): string {
  if (!text) return text;

  const key = getKey();
  const iv = crypto.randomBytes(12); // 12 bytes recomendado para GCM
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf-8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Descriptografa texto no padrão iv:authTag:ciphertext
 * @param {string} encryptedText 
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('INVALID ENCRYPTION FORMAT: Expected iv:authTag:ciphertext');
  }

  const [ivBase64, authTagBase64, encryptedBase64] = parts;
  
  const key = getKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');
  
  return decrypted;
}
