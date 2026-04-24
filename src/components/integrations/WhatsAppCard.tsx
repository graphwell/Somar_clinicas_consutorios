"use client";
import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';
import { IconWhatsApp, IconCheck, IconSettings, IconSpinner } from '@/components/icons/IntegrationIcons';

type WaStatus =
  | 'idle'
  | 'loading'
  | 'sem_instancia'
  | 'WAITING_INSTANCE'
  | 'aguardando_scan'
  | 'conectado'
  | 'central';  // instância compartilhada Synka (UltraMsg central)

interface WaState {
  status: WaStatus;
  migrationStatus?: 'TRIAL' | 'MIGRATING' | 'PRODUCTION';
  qrCode?: string;
  numero?: string;
  mensagem?: string;
  centralInfo?: string;
}

export function WhatsAppCard() {
  const [wa, setWa] = useState<WaState>({ status: 'idle', migrationStatus: 'TRIAL' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    checkCurrentStatus();
    return () => stopPolling();
  }, []);

  async function checkCurrentStatus() {
    setWa(prev => ({ ...prev, status: 'loading' }));
    try {
      const res = await fetchWithAuth('/api/whatsapp/minha-instancia');
      const json = await res.json();
      
      const migrationStatus = json.migrationStatus || 'TRIAL';

      // Instância central Synka (sem instância própria no banco)
      if (!json.instancia && json.central) {
        setWa({
          status: 'central',
          migrationStatus,
          centralInfo: json.central.info,
        });
        return;
      }

      if (!json.instancia) {
        setWa({ status: 'sem_instancia', migrationStatus });
        return;
      }
      const inst = json.instancia;

      if (inst.status === 'EM_USO') {
        setWa({ status: 'conectado', numero: inst.numeroWa ?? undefined, migrationStatus });
      } else if (inst.status === 'AGUARDANDO') {
        // Se está aguardando scan, precisamos buscar o QR Code se ele não veio
        const qrRes = await fetchWithAuth('/api/whatsapp/qrcode');
        const qrJson = await qrRes.json();
        setWa({ status: 'aguardando_scan', qrCode: qrJson.qrCode, migrationStatus });
        startPolling();
      } else {
        setWa({ status: 'sem_instancia', migrationStatus });
      }
    } catch {
      setWa({ status: 'sem_instancia', migrationStatus: 'TRIAL' });
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetchWithAuth('/api/whatsapp/status');
        const json = await res.json();
        if (json.conectado || json.status === 'EM_USO') {
          stopPolling();
          setWa(prev => ({ 
            ...prev, 
            status: 'conectado', 
            numero: json.numero ?? undefined,
            migrationStatus: json.migrationStatus || 'PRODUCTION'
          }));
        }
      } catch { /* silenciar */ }
    }, 5000);
  }

  async function ativar() {
    setWa({ status: 'loading' });
    try {
      const res = await fetchWithAuth('/api/whatsapp/ativar', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'ja_configurado') {
        setWa({ status: 'conectado', numero: json.instancia?.numeroWa ?? undefined });
      } else if (json.status === 'aguardando_scan') {
        const qrRes = await fetchWithAuth('/api/whatsapp/qrcode');
        const qrJson = await qrRes.json();
        setWa({ status: 'aguardando_scan', qrCode: qrJson.qrCode ?? undefined });
        startPolling();
      } else if (json.status === 'qr_gerado') {
        setWa({ status: 'aguardando_scan', qrCode: json.qrCode });
        startPolling();
      } else if (json.status === 'WAITING_INSTANCE' || json.status === 'aguardando_instancia') {
        setWa({ status: 'WAITING_INSTANCE', mensagem: json.mensagem });
      } else if (json.status === 'qr_gerado_inicial') {
        setWa({ status: 'loading', mensagem: 'Preparando QR Code...' });
        // Pequeno delay para o provedor gerar o QR no servidor
        setTimeout(reconectar, 2000);
      } else if (json.status === 'qr_erro') {
        setWa({ status: 'aguardando_scan', mensagem: json.mensagem });
        startPolling();
      } else {
        setWa({ status: 'sem_instancia', mensagem: json.mensagem ?? 'Erro desconhecido.' });
      }
    } catch {
      setWa({ status: 'sem_instancia', mensagem: 'Falha de conexão. Tente novamente.' });
    }
  }

  async function reconectar() {
    setWa({ status: 'loading' });
    try {
      const res = await fetchWithAuth('/api/whatsapp/reconectar', { method: 'POST' });
      const json = await res.json();
      setWa({ status: 'aguardando_scan', qrCode: json.qrCode ?? undefined });
      startPolling();
    } catch {
      setWa(prev => ({ ...prev, status: 'aguardando_scan', mensagem: 'Erro ao gerar QR. Tente novamente.' }));
    }
  }

  const statusBadge = () => {
    switch (wa.status) {
      case 'central': return (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full border shadow-sm" style={{ background: '#F0FAF4', color: '#2D6A4F', borderColor: '#B7E4C7' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#40916C] animate-pulse" /> Ativo via Synka
        </span>
      );
      case 'conectado': return (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full border shadow-sm bg-status-success-bg text-status-success border-status-success/20">
          <IconCheck size={10} /> Conectado
        </span>
      );
      case 'aguardando_scan': return (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full border shadow-sm bg-yellow-50 text-yellow-600 border-yellow-200">
          <IconSpinner size={10} /> Aguardando scan
        </span>
      );
      case 'WAITING_INSTANCE': return (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full border shadow-sm bg-blue-50 text-blue-500 border-blue-200">
          <IconSettings size={10} /> Em configuração
        </span>
      );
      default: return (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full border shadow-sm bg-slate-50 text-text-placeholder border-card-border">
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" /> Inativo
        </span>
      );
    }
  };

  const body = () => {
    if (wa.status === 'loading') {
      return <p className="text-xs text-text-muted italic opacity-70">Verificando...</p>;
    }

    if (wa.migrationStatus === 'MIGRATING' && wa.status !== 'conectado') {
      return (
        <div className="space-y-3">
          <p className="text-xs text-primary font-bold animate-pulse">
            🎉 Promoção para Produção detectada!
          </p>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Sua conta agora tem acesso aos recursos ilimitados. Por favor, escaneie o novo QR Code abaixo para migrar sua conexão.
          </p>
          {wa.qrCode && (
            <img src={wa.qrCode} alt="Novo QR" className="w-32 h-32 rounded-xl border-2 border-primary/20 p-1 shadow-lg" />
          )}
        </div>
      );
    }

    if (wa.status === 'central') {
      return (
        <div style={{ background: '#F0FAF4', border: '1px solid #D8F3DC', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#2D6A4F', margin: 0 }}>
            Instancia compartilhada Synka ativa
          </p>
          <p style={{ fontSize: 11, color: '#52B788', marginTop: 4 }}>
            {wa.centralInfo ?? 'Lembretes e confirmacoes sendo enviados automaticamente.'}
            {' '}Para conectar seu proprio numero, faca upgrade para o plano Pro.
          </p>
        </div>
      );
    }
    if (wa.status === 'conectado') {
      return (
        <p className="text-xs text-text-muted font-medium leading-relaxed italic opacity-70 max-w-[80%]">
          WhatsApp conectado{wa.numero ? ` (${wa.numero})` : ''}. Seu bot de agendamento está ativo.
        </p>
      );
    }
    if (wa.status === 'aguardando_scan') {
      return (
        <p className="text-[10px] text-text-placeholder max-w-[160px] leading-relaxed italic">
          Abra o WhatsApp no seu celular → Configurações → Dispositivos Conectados → Escanear QR Code.
        </p>
      );
    }
    if (wa.status === 'WAITING_INSTANCE') {
      return (
        <p className="text-xs text-text-muted font-medium leading-relaxed italic opacity-70 max-w-[80%]">
          {wa.mensagem ?? 'Estamos preparando seu WhatsApp. Aguarde ou tente novamente em instantes.'}
        </p>
      );
    }
    return (
      <p className="text-xs text-text-muted font-medium leading-relaxed italic opacity-70 max-w-[80%]">
        {wa.mensagem ?? 'Ative o bot de agendamento automático via WhatsApp para sua empresa.'}
      </p>
    );
  };

  const isTrial = wa.migrationStatus === 'TRIAL';

  const trialBanner = () => (
    <div style={{
      background: 'linear-gradient(135deg, #FFF8E1, #FFFDE7)',
      border: '1px solid #FFD54F',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>🕐</span>
      <div>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#E65100', margin: 0, letterSpacing: '-0.2px' }}>
          Período de avaliação ativo
        </p>
        <p style={{ fontSize: 11, color: '#795548', marginTop: 4, lineHeight: 1.5 }}>
          Durante os 30 dias de teste, o agendamento automático já funciona usando a linha compartilhada do Synka. ✅
          <br />
          A conexão do seu número próprio de WhatsApp é liberada assim que seu plano for ativado pela nossa equipe.
        </p>
        <p style={{ fontSize: 10, color: '#A0856A', marginTop: 6, fontWeight: 700 }}>
          📲 Dúvidas? Fale com a equipe Synka: (11) 92520-3237
        </p>
      </div>
    </div>
  );

  const actions = () => {
    if (wa.status === 'loading') return null;

    // Durante trial: mostrar botão desabilitado com tooltip
    if (isTrial && wa.status !== 'conectado' && wa.status !== 'central') {
      return (
        <button
          disabled
          title="Disponível após ativação do plano"
          className="w-full py-4 bg-slate-100 border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase cursor-not-allowed"
        >
          🔒 Disponível após ativação
        </button>
      );
    }

    if (wa.status === 'central') {
      return (
        <button
          onClick={isTrial ? undefined : ativar}
          disabled={isTrial}
          title={isTrial ? 'Disponível após ativação do plano' : undefined}
          className={`flex-1 py-4 bg-white border border-card-border rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm ${
            isTrial ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-text-muted hover:border-primary/40'
          }`}
        >
          {isTrial ? '🔒 Disponível após ativação' : 'Conectar numero proprio'}
        </button>
      );
    }
    if (wa.status === 'conectado') {
      return (
        <button onClick={reconectar} className="flex-1 py-4 bg-white border border-card-border text-text-main rounded-2xl text-[10px] font-black uppercase hover:border-primary/40 transition-all shadow-sm">
          Reconectar
        </button>
      );
    }
    if (wa.status === 'aguardando_scan') {
      return (
        <button onClick={reconectar} className="flex-1 py-4 bg-white border border-card-border text-text-main rounded-2xl text-[10px] font-black uppercase hover:border-primary/40 transition-all shadow-sm">
          Novo QR Code
        </button>
      );
    }
    if (wa.status === 'WAITING_INSTANCE') {
      return (
        <button disabled className="btn-primary w-full py-5 text-[10px] opacity-50 cursor-not-allowed">
          Em configuração...
        </button>
      );
    }
    return (
      <button onClick={ativar} className="btn-primary w-full py-5 text-[10px]">
        Ativar WhatsApp
      </button>
    );
  };

  const isMigrating = wa.migrationStatus === 'MIGRATING';

  return (
    <div className={`premium-card p-12 flex flex-col justify-between group h-96 relative overflow-hidden ${isMigrating ? 'ring-2 ring-primary/30 ring-inset' : ''}`}>
      {isMigrating && (
        <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black px-4 py-1 rounded-bl-xl shadow-sm z-20 animate-bounce">
          UPGRADE DISPONÍVEL
        </div>
      )}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
      <div>
        <div className="flex justify-between items-start mb-10">
          <div className="w-20 h-20 rounded-[2rem] bg-slate-50 border border-card-border flex items-center justify-center shadow-inner group-hover:rotate-6 transition-all" style={{ color: '#40916C' }}>
            <IconWhatsApp size={32} />
          </div>
          {statusBadge()}
        </div>
        <div className="flex justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-2xl font-black italic uppercase text-text-main tracking-tighter mb-4 underline decoration-primary/5 underline-offset-8 decoration-4">
              WhatsApp Bot
            </h3>
            {body()}
          </div>

          {wa.status === 'aguardando_scan' && wa.qrCode && (
            <div className="bg-white p-2.5 rounded-xl border border-card-border shadow-sm self-start group-hover:scale-105 transition-transform origin-top-right">
              <img 
                src={wa.qrCode} 
                alt="QR Code WhatsApp" 
                className="w-48 h-48 block object-contain" 
              />
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 relative z-10">
        {isTrial && wa.status !== 'conectado' && trialBanner()}
        <div className="flex gap-4">
          {actions()}
        </div>
      </div>
    </div>
  );
}
