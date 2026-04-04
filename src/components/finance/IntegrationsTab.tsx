"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

interface IntegrationConfig {
  id: string;
  provider: string;
  isActive: boolean;
  hasCredentials: boolean;
  nomeExibicao?: string;
  updatedAt?: string;
}

const GATEWAYS = [
  { provider: "mercadopago", name: "Mercado Pago", colorHex: "#009EE3", desc: "Aceite PIX e cartão via Mercado Pago." },
  { provider: "stripe",      name: "Stripe",       colorHex: "#635BFF", desc: "Infraestrutura de pagamentos global." },
  { provider: "pagseguro",   name: "PagSeguro",    colorHex: "#1ABB5D", desc: "Pagamentos confiáveis para seus pacientes." },
  { provider: "cielo",       name: "Cielo",        colorHex: "#00AEEF", desc: "Alcance em maquininhas e e-commerce." },
  { provider: "ton",         name: "Ton",          colorHex: "#FF6900", desc: "Maquininha e links de pagamento Ton." },
  { provider: "stone",       name: "Stone",        colorHex: "#00B274", desc: "Soluções financeiras completas Stone." },
];

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/integrations");
      const data = await res.json();
      setIntegrations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function getStatus(provider: string): "connected" | "error" | "idle" {
    const cfg = integrations.find(i => i.provider === provider);
    if (!cfg) return "idle";
    if (cfg.hasCredentials && !cfg.isActive) return "error";
    if (cfg.hasCredentials) return "connected";
    return "idle";
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl animate-pulse" style={{ background: "#F3F4F5" }} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Como funciona */}
      <div className="rounded-xl px-5 py-4 mb-6" style={{ background: "#F8FAF9", border: "1px solid #E2EDE8" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#40916C" }}>Como funciona</p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            "Conecte seu gateway abaixo",
            "Paciente agenda pelo WhatsApp ou link",
            "Sistema gera QR Code PIX ou link",
            "Pagamento confirmado → agendamento pago",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#4A6480" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: "#40916C", color: "white" }}>{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Grid de gateways */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {GATEWAYS.map((g) => {
          const status = getStatus(g.provider);
          const cfg = integrations.find(i => i.provider === g.provider);

          return (
            <GatewayCard
              key={g.provider}
              gateway={g}
              status={status}
              cfg={cfg}
              onConfigure={() => setEditingProvider(g.provider)}
              onDisconnect={async () => {
                if (!confirm("Desconectar este gateway?")) return;
                await fetchWithAuth(`/api/integrations/${g.provider}/desconectar`, { method: "POST" });
                loadData();
              }}
              onTest={async () => {
                await fetchWithAuth(`/api/integrations/${g.provider}/testar`, { method: "POST" });
                loadData();
              }}
            />
          );
        })}
      </div>

      {/* Outras integrações */}
      <div style={{ borderTop: "1px solid #EEE9DF", paddingTop: "24px" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#8A9BB0" }}>
          Outras integrações
        </p>
        <div className="flex flex-wrap gap-2">
          {["n8n", "WhatsApp", "Google Calendar"].map((name) => (
            <span key={name} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#F3F4F5", color: "#8A9BB0", border: "1px solid #E8E4DC" }}>
              {name} <span className="ml-1 text-[10px]">em breve</span>
            </span>
          ))}
        </div>
      </div>

      <ConfigModal
        provider={editingProvider}
        onClose={() => setEditingProvider(null)}
        onDone={loadData}
        isConnected={getStatus(editingProvider || "") === "connected"}
      />
    </>
  );
}

/* ─── Card individual de gateway ─── */
function GatewayCard({ gateway, status, cfg, onConfigure, onDisconnect, onTest }: {
  gateway: typeof GATEWAYS[0];
  status: "connected" | "error" | "idle";
  cfg?: IntegrationConfig;
  onConfigure: () => void;
  onDisconnect: () => void;
  onTest: () => void;
}) {
  const borderLeft = status === "connected" ? "3px solid #40916C"
                   : status === "error"     ? "3px solid #E24B4A"
                   : "3px solid transparent";

  return (
    <div
      className="flex flex-col rounded-xl transition-all duration-150"
      style={{
        background: "white",
        border: "0.5px solid #E8E4DC",
        borderLeft,
        borderRadius: "12px",
        padding: "16px",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = status === "connected" ? "#40916C" : status === "error" ? "#E24B4A" : "#C8DDD4";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#E8E4DC";
        (e.currentTarget as HTMLElement).style.borderLeft = borderLeft;
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: gateway.colorHex }}
          >
            {gateway.name.charAt(0)}
          </div>
          <span className="text-sm font-semibold" style={{ color: "#1B2B3A" }}>{gateway.name}</span>
        </div>
        {status === "connected" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#40916C" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#40916C", boxShadow: "0 0 4px rgba(64,145,108,0.6)" }} />
            Ativo
          </span>
        )}
        {status === "error" && (
          <span className="text-[10px] font-semibold" style={{ color: "#E24B4A" }}>Erro</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 mb-4">
        {status === "connected" && cfg?.nomeExibicao ? (
          <p className="text-xs" style={{ color: "#4A6480" }}>Conta: {cfg.nomeExibicao}</p>
        ) : status === "error" ? (
          <p className="text-xs" style={{ color: "#E24B4A" }}>Token inválido ou expirado</p>
        ) : (
          <>
            <p className="text-xs mb-1" style={{ color: "#8A9BB0" }}>{gateway.desc}</p>
            <p className="text-[11px]" style={{ color: "#B0BBC8" }}>● Não conectado</p>
          </>
        )}
      </div>

      {/* Ações */}
      {status === "idle" && (
        <button
          onClick={onConfigure}
          className="w-full py-2 rounded-lg text-xs font-medium text-white transition-colors"
          style={{ background: "#40916C" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#2D6A4F")}
          onMouseLeave={e => (e.currentTarget.style.background = "#40916C")}
        >
          + Conectar
        </button>
      )}
      {status === "connected" && (
        <div className="flex gap-1.5">
          <button onClick={onTest} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors" style={{ background: "#F0FAF4", color: "#40916C", border: "1px solid #C8DDD4" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#D9F0E3")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F0FAF4")}>
            Testar
          </button>
          <button onClick={onConfigure} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors" style={{ background: "#F3F4F5", color: "#4A6480", border: "1px solid #E8E4DC" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#EAEBEC")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F3F4F5")}>
            Configurar
          </button>
          <button onClick={onDisconnect} className="py-1.5 px-2 rounded-lg text-[11px] transition-colors" style={{ color: "#E24B4A", border: "1px solid #FAD7D7", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}
      {status === "error" && (
        <button
          onClick={onConfigure}
          className="w-full py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "#FEF2F2", color: "#E24B4A", border: "1px solid #FAD7D7" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#FEE2E2")}
          onMouseLeave={e => (e.currentTarget.style.background = "#FEF2F2")}
        >
          Reconfigurar
        </button>
      )}
    </div>
  );
}

/* ─── Modal de configuração ─── */
function ConfigModal({ provider, onClose, onDone, isConnected }: {
  provider: string | null;
  onClose: () => void;
  onDone: () => void;
  isConnected: boolean;
}) {
  const [keys, setKeys]     = useState("");
  const [keys2, setKeys2]   = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (provider) { setKeys(""); setKeys2(""); } }, [provider]);

  if (!provider) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      let credentials: any = {};
      if (provider === "mercadopago") credentials = { accessToken: keys };
      if (provider === "stripe")      credentials = { secretKey: keys };
      if (provider === "pagseguro")   credentials = { token: keys };
      if (provider === "cielo")       credentials = { merchantId: keys, merchantKey: keys2 };
      if (provider === "ton")         credentials = { accessToken: keys };
      if (provider === "stone")       credentials = { secretKey: keys };

      await fetchWithAuth("/api/integrations", {
        method: "POST",
        body: JSON.stringify({ provider, credentials })
      });
      onDone();
      onClose();
    } catch {
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza? Suas cobranças usarão o método manual.")) return;
    setSaving(true);
    try {
      await fetchWithAuth(`/api/integrations/${provider}/desconectar`, { method: "POST" });
      onDone();
      onClose();
    } catch {
      alert("Erro");
    } finally {
      setSaving(false);
    }
  };

  const g = GATEWAYS.find(g => g.provider === provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm shadow-2xl overflow-hidden" style={{ background: "white", border: "1px solid #EEE9DF", borderRadius: "16px" }}>
        <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid #EEE9DF" }}>
          {g && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: g.colorHex }}>
              {g.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-semibold capitalize" style={{ color: "#1B2B3A" }}>
              Configurar {g?.name || provider}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#8A9BB0" }}>Chaves criptografadas com AES-256</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4" style={{ background: "#FAFAF9" }}>
          <div>
            <label className="block text-[11px] uppercase font-semibold mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.6px" }}>
              {provider === "cielo" ? "Merchant ID" : provider === "mercadopago" ? "Access Token" : "Chave Secreta / Token"}
            </label>
            <input
              type="password"
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors"
              style={{ background: "white", border: "1px solid #EEE9DF", color: "#1B2B3A" }}
              onFocus={e  => (e.currentTarget.style.borderColor = "#40916C")}
              onBlur={e   => (e.currentTarget.style.borderColor = "#EEE9DF")}
              placeholder="Ex: APP_USR-..."
              value={keys}
              onChange={e => setKeys(e.target.value)}
            />
          </div>
          {provider === "cielo" && (
            <div>
              <label className="block text-[11px] uppercase font-semibold mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.6px" }}>Merchant Key</label>
              <input
                type="password"
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors"
                style={{ background: "white", border: "1px solid #EEE9DF", color: "#1B2B3A" }}
                onFocus={e  => (e.currentTarget.style.borderColor = "#40916C")}
                onBlur={e   => (e.currentTarget.style.borderColor = "#EEE9DF")}
                placeholder="Chave da Cielo..."
                value={keys2}
                onChange={e => setKeys2(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex gap-2" style={{ borderTop: "1px solid #EEE9DF" }}>
          {isConnected && (
            <button onClick={handleDisconnect} disabled={saving} className="px-3 text-sm font-medium rounded-lg transition-colors" style={{ color: "#DC2626" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              Desconectar
            </button>
          )}
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 text-sm rounded-xl transition-colors"
            style={{ border: "1px solid #EEE9DF", color: "#4A6480", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F9F7F4")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            Cancelar
          </button>
          <button disabled={saving || !keys} onClick={handleSave} className="flex-1 py-2.5 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50"
            style={{ background: "#40916C" }}
            onMouseEnter={e => { if (!saving && keys) e.currentTarget.style.background = "#2D6A4F"; }}
            onMouseLeave={e => (e.currentTarget.style.background = "#40916C")}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
