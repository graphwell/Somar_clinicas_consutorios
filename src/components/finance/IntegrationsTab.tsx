"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import { PLANOS, PlanoInfo } from "@/lib/planos-synka";

interface IntegrationConfig {
  id: string;
  provider: string;
  isActive: boolean;
  hasCredentials: boolean;
  nomeExibicao?: string;
}

interface MeResponse {
  planStatus: string;
  plano: string;
  trialFim?: string;
  diasRestantesTrial?: number;
}

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);

  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [isHandlingCheckout, setIsHandlingCheckout] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [integrationsRes, meRes] = await Promise.all([
        fetchWithAuth("/api/integrations"),
        fetchWithAuth("/api/auth/me")
      ]);
      const ints = await integrationsRes.json();
      const meData = await meRes.json();
      setIntegrations(Array.isArray(ints) ? ints : []);
      setMe(meData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleCheckout = async (planoId: string) => {
    setIsHandlingCheckout(planoId);
    try {
      const res = await fetchWithAuth("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plano: planoId })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Erro ao gerar checkout");
    } catch {
      alert("Erro ao processar assinatura");
    } finally {
      setIsHandlingCheckout(null);
    }
  };

  const Gateways = [
    { provider: "mercadopago", name: "Mercado Pago", colorHex: "#009EE3", desc: "Aceite PIX e Cartões via Mercado Pago diretamente na plataforma." },
    { provider: "stripe",      name: "Stripe",       colorHex: "#635BFF", desc: "A infraestrutura de pagamentos mais robusta do mundo." },
    { provider: "pagseguro",   name: "PagSeguro",    colorHex: "#1ABB5D", desc: "Pagamentos confiáveis para seus pacientes." },
    { provider: "cielo",       name: "Cielo",        colorHex: "#00AEEF", desc: "Reconhecimento e alcance em maquininhas e e-commerce." }
  ];

  return (
    <div className="space-y-8 pb-10">

      {/* SEÇÃO ASSINATURA SYNKA */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#1B2B3A" }}>
            Sua Assinatura Synka
          </h3>
          <p className="text-sm mt-0.5" style={{ color: "#4A6480" }}>
            Gerencie seu plano atual e acesse novas funcionalidades.
          </p>
        </div>

        {loading ? (
          <div className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
        ) : me && (
          <div
            className="rounded-xl px-6 py-5"
            style={{
              background: "#F0FAF4",
              border: "1.5px solid #40916C",
              borderRadius: "12px"
            }}
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-lg font-medium capitalize" style={{ color: "#1B4332" }}>
                    {PLANOS[me.plano]?.nome || me.plano}
                  </h4>
                  <span
                    className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full"
                    style={{
                      background: me.planStatus === "active" ? "#D1FAE5" : me.planStatus === "trial" ? "#FEF3C7" : "#FEE2E2",
                      color:      me.planStatus === "active" ? "#065F46" : me.planStatus === "trial" ? "#92400E" : "#991B1B"
                    }}
                  >
                    {me.planStatus === "active" ? "Ativo" : me.planStatus === "trial" ? "Trial" : "Expirado"}
                  </span>
                </div>
                {me.planStatus === "trial" && (
                  <p className="text-sm" style={{ color: "#2D6A4F" }}>
                    Você tem <strong style={{ fontWeight: 600 }}>{me.diasRestantesTrial} dias restantes</strong> no seu período de testes.
                  </p>
                )}
                {me.planStatus === "expired" && (
                  <p className="text-sm font-semibold" style={{ color: "#991B1B" }}>
                    Seu período de trial expirou. Renove para continuar usando.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {me.planStatus === "active" ? (
                  <button
                    onClick={() => window.open(process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL, "_blank")}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ border: "1.5px solid #40916C", color: "#40916C", background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F0FAF4")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    Portal do Assinante
                  </button>
                ) : (
                  <button
                    onClick={() => window.scrollTo({ top: 500, behavior: "smooth" })}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors w-full sm:w-auto"
                    style={{ background: "#40916C" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#2D6A4F")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#40916C")}
                  >
                    Fazer Upgrade Agora
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CARDS DE PLANOS */}
        {!loading && me?.planStatus !== "active" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {["solo", "pro", "business"].map((pId) => {
              const plano = PLANOS[pId] as PlanoInfo;
              if (!plano) return null;
              const isPro = pId === "pro";

              return (
                <div
                  key={pId}
                  className="relative flex flex-col rounded-2xl"
                  style={{
                    background: "white",
                    border: isPro ? "2px solid #40916C" : "1px solid #EEE9DF",
                    borderRadius: "16px",
                    padding: "28px 24px"
                  }}
                >
                  {isPro && (
                    <span
                      className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
                      style={{ background: "#40916C", color: "white", letterSpacing: "0.8px" }}
                    >
                      Mais Escolhido
                    </span>
                  )}

                  <h5 className="text-lg font-medium mb-1" style={{ color: "#1B2B3A" }}>
                    {plano.nome}
                  </h5>
                  <p className="text-xs mb-5 min-h-[2.5rem]" style={{ color: "#8A9BB0" }}>
                    {plano.descricao}
                  </p>

                  <div className="mb-6">
                    <span className="font-semibold" style={{ color: "#1B2B3A", fontSize: "32px" }}>
                      R$ {plano.precoBRL.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-sm ml-1" style={{ color: "#8A9BB0" }}>/mês</span>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plano.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#4A6480" }}>
                        <span className="mt-0.5 font-bold" style={{ color: "#40916C" }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={isHandlingCheckout === pId}
                    onClick={() => handleCheckout(pId)}
                    className="w-full rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      height: "44px",
                      background:   isPro ? "#40916C" : "transparent",
                      color:        isPro ? "white"   : "#40916C",
                      border:       isPro ? "none"    : "1.5px solid #40916C"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isPro ? "#2D6A4F" : "#F0FAF4";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isPro ? "#40916C" : "transparent";
                    }}
                  >
                    {isHandlingCheckout === pId ? "Gerando checkout…" : `Assinar ${plano.nome}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEPARADOR */}
      <div style={{ borderTop: "1px solid #EEE9DF", margin: "32px 0" }} />

      {/* SEÇÃO GATEWAYS */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#1B2B3A" }}>
            Gateways de Pagamento
          </h3>
          <p className="text-sm mt-0.5" style={{ color: "#4A6480" }}>
            Conecte a conta do seu banco para receber online dos seus pacientes (PIX e Cartões).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Gateways.map((g) => {
            const config = integrations.find(i => i.provider === g.provider && i.isActive);
            const isConnected = !!config?.hasCredentials;

            return (
              <div
                key={g.provider}
                className="flex flex-col justify-between rounded-2xl"
                style={{
                  background: "white",
                  border: "1px solid #EEE9DF",
                  borderRadius: "16px",
                  padding: "20px"
                }}
              >
                <div>
                  <div
                    className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center font-black text-white shadow-sm"
                    style={{ background: g.colorHex }}
                  >
                    {g.name.charAt(0)}
                  </div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: "#1B2B3A" }}>
                    {g.name}
                    {isConnected && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: "#40916C", boxShadow: "0 0 6px rgba(64,145,108,0.7)" }}
                        title="Conectado"
                      />
                    )}
                  </h4>
                  <p className="text-xs leading-relaxed mb-5" style={{ color: "#8A9BB0" }}>
                    {g.desc}
                  </p>
                </div>
                <button
                  onClick={() => setEditingProvider(g.provider)}
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: isConnected ? "transparent" : "#40916C",
                    color:      isConnected ? "#4A6480"     : "white",
                    border:     isConnected ? "1px solid #EEE9DF" : "none"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isConnected ? "#F9F7F4" : "#2D6A4F";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isConnected ? "transparent" : "#40916C";
                  }}
                >
                  {isConnected ? "⚙️ Configurar" : "+ Conectar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <ConfigModal
        provider={editingProvider}
        onClose={() => setEditingProvider(null)}
        onDone={loadData}
        isConnected={!!integrations.find(i => i.provider === editingProvider && i.isActive)?.hasCredentials}
      />
    </div>
  );
}

function ConfigModal({ provider, onClose, onDone, isConnected }: {
  provider: string | null;
  onClose: () => void;
  onDone: () => void;
  isConnected: boolean;
}) {
  const [keys, setKeys]   = useState("");
  const [keys2, setKeys2] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (provider) { setKeys(""); setKeys2(""); }
  }, [provider]);

  if (!provider) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      let credentials: any = {};
      if (provider === "mercadopago") credentials = { accessToken: keys };
      if (provider === "stripe")      credentials = { secretKey: keys };
      if (provider === "pagseguro")   credentials = { token: keys };
      if (provider === "cielo")       credentials = { merchantId: keys, merchantKey: keys2 };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-sm shadow-2xl overflow-hidden"
        style={{ background: "white", border: "1px solid #EEE9DF", borderRadius: "16px" }}
      >
        <div className="px-6 py-5" style={{ borderBottom: "1px solid #EEE9DF" }}>
          <h3 className="font-semibold capitalize" style={{ color: "#1B2B3A" }}>
            Configurar {provider}
          </h3>
          <p className="text-xs mt-1" style={{ color: "#8A9BB0" }}>
            Insira suas chaves de API secretas com segurança.
          </p>
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
              <label className="block text-[11px] uppercase font-semibold mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.6px" }}>
                Merchant Key
              </label>
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
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="px-3 text-sm font-medium rounded-lg transition-colors"
              style={{ color: "#DC2626" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              Desconectar
            </button>
          )}
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 text-sm rounded-xl transition-colors ml-auto"
            style={{ border: "1px solid #EEE9DF", color: "#4A6480", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F9F7F4")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Cancelar
          </button>
          <button
            disabled={saving || !keys}
            onClick={handleSave}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50"
            style={{ background: "#40916C" }}
            onMouseEnter={e => { if (!saving && keys) e.currentTarget.style.background = "#2D6A4F"; }}
            onMouseLeave={e => (e.currentTarget.style.background = "#40916C")}
          >
            {saving ? "Salvando…" : "Salvar Seguro"}
          </button>
        </div>
      </div>
    </div>
  );
}
