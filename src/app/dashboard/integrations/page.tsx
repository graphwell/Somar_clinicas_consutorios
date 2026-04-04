"use client";

import React from "react";
import { IntegrationsTab } from "@/components/finance/IntegrationsTab";
import { WhatsAppCard } from "@/components/integrations/WhatsAppCard";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1B2B3A" }}>Integrações</h1>
        <p className="text-sm mt-1" style={{ color: "#4A6480" }}>
          Conecte WhatsApp, gateways de pagamento e outros serviços à sua conta.
        </p>
      </div>

      {/* Comunicação & Automação */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#8A9BB0" }}>
          Comunicação & Automação
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WhatsAppCard />
        </div>
      </div>

      {/* Gateways de Pagamento */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#8A9BB0" }}>
          Gateways de Pagamento
        </p>
        <IntegrationsTab />
      </div>
    </div>
  );
}
