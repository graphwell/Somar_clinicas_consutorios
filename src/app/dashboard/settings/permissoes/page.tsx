"use client";
import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  RECURSOS,
  ACOES,
  LABELS_RECURSO,
  LABELS_ACAO,
  PERMISSOES_PADRAO,
} from "@/lib/permissoes-padrao";

type RoleTab = "recepcao" | "profissional";

interface PermMatrix {
  [recurso: string]: {
    [acao: string]: boolean;
  };
}

function buildMatrix(permissoes: any[]): PermMatrix {
  const matrix: PermMatrix = {};
  for (const recurso of RECURSOS) {
    matrix[recurso] = {};
    for (const acao of ACOES) {
      matrix[recurso][acao] = false;
    }
  }
  for (const p of permissoes) {
    if (matrix[p.recurso]) {
      matrix[p.recurso][p.acao] = p.ativo ?? true;
    }
  }
  return matrix;
}

function matrixToArray(matrix: PermMatrix, role: string) {
  return RECURSOS.flatMap((recurso) =>
    ACOES.map((acao) => ({
      recurso,
      acao,
      ativo: matrix[recurso]?.[acao] ?? false,
    }))
  );
}

export default function PermissoesPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<RoleTab>("recepcao");
  const [matrices, setMatrices] = useState<Record<RoleTab, PermMatrix>>({
    recepcao: buildMatrix(PERMISSOES_PADRAO.recepcao || []),
    profissional: buildMatrix(PERMISSOES_PADRAO.profissional || []),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadPermissoes(role: RoleTab) {
    try {
      const r = await fetchWithAuth("/api/settings/permissoes", {
        method: "POST",
        body: JSON.stringify({ targetRole: role }),
      });
      const d = await r.json();
      const perms = d.permissoes || [];
      setMatrices((prev) => ({ ...prev, [role]: buildMatrix(perms) }));
    } catch {}
  }

  useEffect(() => {
    Promise.all([
      loadPermissoes("recepcao"),
      loadPermissoes("profissional"),
    ]).finally(() => setLoading(false));
  }, []);

  function toggle(role: RoleTab, recurso: string, acao: string) {
    setMatrices((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [recurso]: {
          ...prev[role][recurso],
          [acao]: !prev[role][recurso][acao],
        },
      },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await Promise.all(
        (["recepcao", "profissional"] as RoleTab[]).map((role) =>
          fetchWithAuth("/api/settings/permissoes", {
            method: "PATCH",
            body: JSON.stringify({
              role,
              permissoes: matrixToArray(matrices[role], role),
            }),
          })
        )
      );
      toast.success("Permissões salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar permissões.");
    } finally {
      setSaving(false);
    }
  }

  const currentMatrix = matrices[tab];

  return (
    <div className="fade-up max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-700">
            Permissões por função
          </h1>
          <p className="text-sm text-slate-100 mt-0.5">
            Controle o que cada função pode ver e fazer na plataforma.
          </p>
        </div>
        <Button variant="primary" loading={saving} onClick={save}>
          Salvar alterações
        </Button>
      </div>

      {/* Aviso */}
      <div className="bg-gold-100 border border-gold-500/20 rounded-xl px-4 py-3 mb-5 text-sm text-gold-500 flex items-start gap-2">
        <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.167L12.833 11.083H1.167L7 1.167z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 5.833v2.334M7 10h.008" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        Mudanças aplicadas imediatamente para todos os usuários da função selecionada.
      </div>

      <Card className="overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-warm-200">
          {(["recepcao", "profissional"] as RoleTab[]).map((role) => (
            <button
              key={role}
              onClick={() => setTab(role)}
              className={[
                "flex-1 py-3 text-sm font-medium capitalize transition-colors",
                tab === role
                  ? "text-sage-600 border-b-2 border-sage-500"
                  : "text-slate-100 hover:text-slate-700",
              ].join(" ")}
            >
              {role === "recepcao" ? "Recepção" : "Profissional"}
            </button>
          ))}
          {/* Admin: sempre tudo — não editável */}
          <div className="flex-1 py-3 text-sm text-center text-slate-100">
            Admin (acesso total)
          </div>
        </div>

        {/* Tabela de permissões */}
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-100 animate-pulse">
            Carregando permissões…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-300 w-40">
                    Recurso
                  </th>
                  {ACOES.map((acao) => (
                    <th
                      key={acao}
                      className="text-center px-4 py-3 text-xs font-medium text-slate-300"
                    >
                      {LABELS_ACAO[acao]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECURSOS.map((recurso) => (
                  <tr
                    key={recurso}
                    className="border-t border-warm-100 hover:bg-warm-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                      {LABELS_RECURSO[recurso]}
                    </td>
                    {ACOES.map((acao) => {
                      const checked = currentMatrix[recurso]?.[acao] ?? false;
                      return (
                        <td key={acao} className="text-center px-4 py-3">
                          <button
                            onClick={() => toggle(tab, recurso, acao)}
                            className={[
                              "w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all",
                              checked
                                ? "bg-sage-500 border-sage-500"
                                : "border-warm-300 hover:border-sage-400",
                            ].join(" ")}
                          >
                            {checked && (
                              <svg
                                viewBox="0 0 12 12"
                                fill="none"
                                className="w-3 h-3"
                              >
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="white"
                                  strokeWidth={1.8}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
