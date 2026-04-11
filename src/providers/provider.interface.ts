export interface IncomingMessage {
  instanceId: string;
  messageId:  string;
  from:       string;
  body:       string;
  timestamp:  number;
  raw:        unknown;
}

export interface IProvider {
  name: 'wasender' | 'ultramsg';

  /** Parseia o body cru do webhook para IncomingMessage. Retorna null se não for mensagem de entrada. */
  parseWebhook(body: unknown): IncomingMessage | null;

  /** Valida assinatura HMAC — retorna false se inválida. */
  validateSignature(rawBody: Buffer, signature: string, secret: string): boolean;

  /** Conecta instância no provedor e retorna o instanceId criado. */
  connectInstance(apiKey: string, webhookUrl: string): Promise<string>;

  /** Desconecta instância no provedor. Sempre chama a API real. */
  disconnectInstance(apiKey: string, instanceId: string): Promise<void>;

  /** Envia mensagem de texto via provedor. */
  sendMessage(apiKey: string, instanceId: string, to: string, text: string): Promise<void>;
}
