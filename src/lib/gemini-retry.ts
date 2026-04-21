import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export function getGeminiModel(modelOverride?: string): GenerativeModel {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  return genAI.getGenerativeModel({
    model: modelOverride || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  });
}

/**
 * Chama generateContent com retry automático em caso de 429 (rate limit).
 * Espera 2s, 4s, 8s antes de cada nova tentativa.
 */
export async function generateWithRetry(
  model: GenerativeModel,
  parts: Parameters<GenerativeModel['generateContent']>[0],
  maxAttempts = 3,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(parts);
      return result.response.text();
    } catch (err: any) {
      lastError = err;
      const is429 =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.toLowerCase().includes('resource exhausted') ||
        err?.message?.toLowerCase().includes('too many requests');
      if (!is429 || attempt === maxAttempts) throw err;
      const waitMs = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}
