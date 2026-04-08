import { wasenderGet, ultraMsgGet } from './wasender';

/**
 * Interface padronizada para retorno de status de qualquer provedor
 */
export interface WhatsAppStatus {
  conectado: boolean;
  numero: string | null;
  statusRaw: string | null;
}

/**
 * Camada de abstração para múltiplos provedores de WhatsApp.
 * Segue a regra de ouro: Extende a funcionalidade sem quebrar o que já existe.
 */
export const WhatsAppProvider = {
  /**
   * Busca o QR Code no provedor adequado e retorna em formato base64 ou URL de data.
   */
  async getQrCode(plataforma: string, sessionId: string, token: string): Promise<string> {
    if (plataforma === 'ULTRAMSG') {
      try {
        const qrUrl = `https://api.ultramsg.com/${sessionId}/instance/qr?token=${token}`;
        const res = await fetch(qrUrl);
        if (!res.ok) throw new Error(`UltraMsg Error: ${res.status}`);
        
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return `data:image/png;base64,${base64}`;
      } catch (err: any) {
        console.error('[WhatsAppProvider] Erro ao buscar QR UltraMsg:', err);
        throw new Error(`Falha ao conectar com UltraMsg: ${err.message}`);
      }
    }
    
    // Provedor Padrão: WaSender
    const { ok, data } = await wasenderGet(token, '/qr-code');
    if (!ok) {
      throw new Error(`Falha ao gerar novo QR no WaSenderAPI: ${JSON.stringify(data)}`);
    }
    
    return data.qrCode ?? data.qr ?? data;
  },

  /**
   * Consulta o status real da sessão no provedor e normaliza o retorno.
   */
  async getStatus(plataforma: string, sessionId: string, token: string): Promise<WhatsAppStatus> {
    if (plataforma === 'ULTRAMSG') {
      try {
        const { ok, data } = await ultraMsgGet(sessionId, token, 'instance/status');
        
        // No UltraMsg, o status comum de conectado é "linked" ou "connected"
        const conectado = ok && (data.status === 'linked' || data.status === 'connected');
        
        let numero = null;
        if (conectado) {
          const info = await ultraMsgGet(sessionId, token, 'instance/info');
          // info costuma retornar id como "5511999999999@c.us"
          numero = info.data?.id?.split('@')[0] || null;
        }

        return {
          conectado,
          numero,
          statusRaw: data.status || 'unknown'
        };
      } catch (err: any) {
        console.error('[WhatsAppProvider] Erro ao buscar status UltraMsg:', err);
        return { conectado: false, numero: null, statusRaw: 'error' };
      }
    }

    // Provedor Padrão: WaSender
    const { ok, data } = await wasenderGet(token, '/session/status');
    return {
      conectado: ok && (data.connected || data.status === 'connected'),
      numero: data.number || data.phoneNumber || null,
      statusRaw: data.status || null
    };
  }
};
