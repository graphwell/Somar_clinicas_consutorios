'use client';
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

interface Props {
  assinanteId:  string;
  pacienteNome: string;
  planoNome:    string;
  valor:        number;
  onClose:      () => void;
  onPago:       () => void;
}

type Estado = 'gerando' | 'aguardando' | 'copiado' | 'confirmando' | 'pago' | 'erro';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ModalCobrancaPix({ assinanteId, pacienteNome, planoNome, valor, onClose, onPago }: Props) {
  const [estado,       setEstado]       = useState<Estado>('gerando');
  const [copiaCola,    setCopiaCola]    = useState('');
  const [transacaoId,  setTransacaoId]  = useState<string | undefined>();
  const [erroMsg,      setErroMsg]      = useState('');

  useEffect(() => {
    fetchWithAuth('/api/subscriptions/gerar-cobranca-pix', {
      method: 'POST',
      body:   JSON.stringify({ assinaturaClienteId: assinanteId }),
    })
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        if (d['error']) {
          setErroMsg(
            d['error'] === 'PIX_NAO_CONFIGURADO'
              ? 'Pix não configurado para esta barbearia. Configure em Integrações → Pix.'
              : String(d['error']),
          );
          setEstado('erro');
          return;
        }
        setCopiaCola(String(d['copiaCola'] ?? ''));
        setTransacaoId(d['transacaoId'] ? String(d['transacaoId']) : undefined);
        setEstado('aguardando');
      })
      .catch(() => {
        setErroMsg('Não foi possível gerar a cobrança. Tente novamente.');
        setEstado('erro');
      });
  }, [assinanteId]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(copiaCola);
      setEstado('copiado');
      setTimeout(() => setEstado('aguardando'), 2000);
    } catch { /* fallback silencioso */ }
  }

  async function confirmarManual() {
    setEstado('confirmando');
    try {
      const r = await fetchWithAuth('/api/subscriptions/confirmar-pagamento', {
        method: 'POST',
        body:   JSON.stringify({ assinaturaClienteId: assinanteId, transacaoId }),
      });
      const d = await r.json() as { ok?: boolean };
      if (d.ok) { setEstado('pago'); onPago(); }
      else       { setErroMsg('Erro ao confirmar pagamento.'); setEstado('erro'); }
    } catch {
      setErroMsg('Erro de conexão ao confirmar pagamento.');
      setEstado('erro');
    }
  }

  const qrUrl = copiaCola
    ? `https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=${encodeURIComponent(copiaCola)}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm my-10 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'white', border: '1px solid #EEE9DF' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: '1px solid #EEE9DF' }}>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: '#1B2B3A' }}>Cobrar via Pix</h3>
            <p className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>{pacienteNome} · {planoNome}</p>
          </div>
          <button onClick={onClose} style={{ color: '#8A9BB0' }}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4" style={{ background: '#FAFAF9' }}>
          {/* Valor */}
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#1B2B3A' }}>{fmtBRL(valor)}</p>
            <p className="text-xs mt-1" style={{ color: '#8A9BB0' }}>Valor da mensalidade do plano</p>
          </div>

          {/* Conteúdo por estado */}
          {estado === 'gerando' && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm" style={{ color: '#4A6480' }}>Gerando cobrança...</p>
            </div>
          )}

          {(estado === 'aguardando' || estado === 'copiado' || estado === 'confirmando') && (
            <>
              {/* QR Code */}
              {qrUrl && (
                <div className="flex justify-center">
                  <img src={qrUrl} alt="QR Code Pix" width={200} height={200} className="rounded-xl border border-slate-100" />
                </div>
              )}

              {/* Copia e cola */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase" style={{ color: '#4A6480', letterSpacing: '0.5px' }}>Código Pix (copia e cola)</p>
                <div className="rounded-xl p-3 text-[11px] font-mono break-all" style={{ background: '#F3F4F5', color: '#1B2B3A', border: '1px solid #EEE9DF' }}>
                  {copiaCola.slice(0, 60)}…
                </div>
                <button
                  onClick={copiar}
                  disabled={estado === 'copiado'}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                  style={{
                    background: estado === 'copiado' ? '#D1FAE5' : '#F0FAF4',
                    color:      estado === 'copiado' ? '#065F46'  : '#40916C',
                    border:     `1px solid ${estado === 'copiado' ? '#A7F3D0' : '#C8DDD4'}`,
                  }}
                >
                  {estado === 'copiado' ? '✓ Copiado!' : '📋 Copiar código Pix'}
                </button>
              </div>

              {/* Confirmar manual */}
              <div style={{ borderTop: '1px solid #EEE9DF', paddingTop: 16 }}>
                <button
                  onClick={confirmarManual}
                  disabled={estado === 'confirmando'}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: '#40916C' }}
                >
                  {estado === 'confirmando' ? 'Confirmando...' : 'Confirmar pagamento manual'}
                </button>
                <p className="text-[10px] text-center mt-2" style={{ color: '#8A9BB0' }}>
                  O pagamento Pix é confirmado automaticamente via webhook quando disponível.
                </p>
              </div>
            </>
          )}

          {estado === 'pago' && (
            <div className="text-center py-4 space-y-2">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="font-semibold" style={{ color: '#1B2B3A' }}>Pagamento confirmado!</p>
              <p className="text-sm" style={{ color: '#4A6480' }}>Plano renovado com sucesso.</p>
            </div>
          )}

          {estado === 'erro' && (
            <div className="rounded-xl p-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <p className="text-sm font-medium" style={{ color: '#DC2626' }}>{erroMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
