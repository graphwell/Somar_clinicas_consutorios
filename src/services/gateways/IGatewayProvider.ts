export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authorizationCode?: string;
  qrCode?: string;
  checkoutUrl?: string;
  error?: string;
}

export interface WebhookResult {
  handled: boolean;
  type?: string;
  metadata?: any;
  error?: string;
}

export interface IGatewayProvider {
  /**
   * Initializes or tests the connection using raw decrypted credentials.
   * Useful to ensure the API key is active.
   */
  ping(credentials: Record<string, any>): Promise<boolean>;

  /**
   * Universal Payment Handler interface.
   */
  createPayment(
    credentials: Record<string, any>, 
    amount: number, 
    currency: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult>;

  /**
   * Generic refund processor.
   */
  refund(
    credentials: Record<string, any>, 
    transactionId: string
  ): Promise<boolean>;

  /**
   * Standalone webhook handler for incoming gateway events.
   */
  webhookHandler(req: Request, rawBody: string, secret?: string): Promise<WebhookResult>;
}
