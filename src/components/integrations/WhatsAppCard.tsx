"use client";
import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';
import { IconWhatsApp, IconCheck, IconSettings, IconSpinner } from '@/components/icons/IntegrationIcons';

type WaStatus =
  | 'idle'
  | 'loading'
  | 'sem_instancia'
  | 'aguardando_instancia'
  | 'aguardando_scan'
  | 'conectado';

interface WaState {
  status: WaStatus;
  migrationStatus?: 'TRIAL' | 'MIGRATING' | 'PRODUCTION';
  qrCode?: string;
  numero?: string;
  mensagem?: string;
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
      } else if (json.status === 'aguardando_instancia') {
        setWa({ status: 'aguardando_instancia', mensagem: json.mensagem });
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
      case 'aguardando_instancia': return (
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

    if (wa.status === 'conectado') {
      return (
        <p className="text-xs text-text-muted font-medium leading-relaxed italic opacity-70 max-w-[80%]">
          WhatsApp conectado{wa.numero ? ` (${wa.numero})` : ''}. Seu bot de agendamento está ativo.
        </p>
      );
    }
    if (wa.status === 'aguardando_scan') {
      return (
        <div className="space-y-3">
          {wa.qrCode ? (
            <img src={wa.qrCode} alt="QR Code WhatsApp" className="w-40 h-40 rounded-2xl border border-card-border shadow" />
          ) : (
            <p className="text-xs text-text-muted italic opacity-70">{wa.mensagem ?? 'QR Code em geração...'}</p>
          )}
          <p className="text-[10px] text-text-placeholder">Abra o WhatsApp → Dispositivos Conectados → Adicionar dispositivo</p>
        </div>
      );
    }
    if (wa.status === 'aguardando_instancia') {
      return (
        <p className="text-xs text-text-muted font-medium leading-relaxed italic opacity-70 max-w-[80%]">
          {wa.mensagem ?? 'WhatsApp em configuração. Em breve você receberá acesso. Nossa equipe foi notificada.'}
        </p>
      );
    }
    return (
      <p className="text-xs text-text-muted font-medium leading-relaxed italic opacity-70 max-w-[80%]">
        {wa.mensagem ?? 'Ative o bot de agendamento automático via WhatsApp para sua empresa.'}
      </p>
    );
  };

  const actions = () => {
    if (wa.status === 'loading') return null;
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
    if (wa.status === 'aguardando_instancia') {
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
        <h3 className="text-2xl font-black italic uppercase text-text-main tracking-tighter mb-4 underline decoration-primary/5 underline-offset-8 decoration-4">
          WhatsApp Bot
        </h3>
        {body()}
      </div>
      <div className="mt-12 flex gap-4 relative z-10">
        {actions()}
      </div>
    </div>
  );
}
