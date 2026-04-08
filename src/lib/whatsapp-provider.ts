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
 * Centraliza a inteligência de como conversar com cada API.
 */
export const WhatsAppProvider = {
  /**
   * Busca o QR Code no provedor adequado e retorna em formato base64 ou URL de data.
   */
  async getQrCode(plataforma: string, sessionId: string, token: string): Promise<string> {
    if (plataforma === 'ULTRAMSG') {
      try {
        // O link direto da imagem costuma ser o mais estável para o front
        return `https://api.ultramsg.com/${sessionId}/instance/qr?token=${token}&timestamp=${Date.now()}`;
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
    try {
      if (plataforma === 'ULTRAMSG') {
        const { ok, data } = await ultraMsgGet(sessionId, token, 'instance/status');
        
        // No UltraMsg, 'active' ou 'connected' são status de sucesso
        const conectado = ok && (data.status === 'linked' || data.status === 'connected' || data.status === 'active');
        
        let numero = null;
        if (conectado) {
          const info = await ultraMsgGet(sessionId, token, 'instance/info');
          // Tentando pegar o número do ID ou do telefone direto
          const rawId = info.data?.id || info.data?.phone;
          numero = rawId ? rawId.split('@')[0] : null;
        }

        return {
          conectado,
          numero,
          statusRaw: data.status || 'unknown'
        };
      }

      // Provedor Padrão: WaSender
      // Usamos /session para pegar os dados da sessão (incluindo o número conectado se houver)
      const { ok, data } = await wasenderGet(token, '/session');
      
      const conectado = ok && (data.status === 'connected' || data.connected === true);
      
      return {
        conectado,
        numero: data.number || data.phoneNumber || null,
        statusRaw: data.status || null
      };
    } catch (err: any) {
      console.error(`[WhatsAppProvider] Erro crítico ao buscar status (${plataforma}):`, err.message);
      return { conectado: false, numero: null, statusRaw: 'error' };
    }
  }
};
