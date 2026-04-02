"use client";

import React from "react";
import { IntegrationsTab } from "@/components/finance/IntegrationsTab";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1B2B3A" }}>Planos & Integrações</h1>
        <p className="text-sm mt-1" style={{ color: "#4A6480" }}>
          Gerencie a sua assinatura Synka e conecte seus métodos de pagamento favoritos.
        </p>
      </div>

      <IntegrationsTab />
    </div>
  );
}
