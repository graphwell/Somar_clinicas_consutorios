"use client";

import React from "react";
import { IntegrationsTab } from "@/components/finance/IntegrationsTab";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Planos & Integrações</h1>
        <p className="text-sm text-gray-400 mt-1">
          Gerencie a sua assinatura Synka e conecte seus métodos de pagamento favoritos.
        </p>
      </div>

      <IntegrationsTab />
    </div>
  );
}
