"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

interface Permissao {
  recurso: string;
  acao: string;
  ativo: boolean;
}

interface UsePermissaoResult {
  pode: (recurso: string, acao: string) => boolean;
  permissoes: Permissao[];
  loading: boolean;
  role: string;
}

let cachedRole = "";
let cachedPerms: Permissao[] = [];
let cacheLoaded = false;

export function usePermissao(): UsePermissaoResult {
  const [role, setRole] = useState(cachedRole);
  const [permissoes, setPermissoes] = useState<Permissao[]>(cachedPerms);
  const [loading, setLoading] = useState(!cacheLoaded);

  useEffect(() => {
    if (cacheLoaded) return;

    // Ler role do localStorage
    try {
      const stored = localStorage.getItem("synka-user");
      if (stored) {
        const u = JSON.parse(stored);
        const r = u?.role || "recepcao";
        setRole(r);
        cachedRole = r;

        // Admin e synka_admin não precisam buscar permissões
        if (r === "admin" || r === "synka_admin") {
          cacheLoaded = true;
          setLoading(false);
          return;
        }

        // Buscar permissões do servidor
        fetchWithAuth("/api/settings/permissoes")
          .then((res) => res.json())
          .then((data) => {
            const perms: Permissao[] = data.permissoes || [];
            setPermissoes(perms);
            cachedPerms = perms;
            cacheLoaded = true;
          })
          .catch(() => {
            cacheLoaded = true;
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const pode = useCallback(
    (recurso: string, acao: string): boolean => {
      // Admin sempre tem acesso total
      if (role === "admin" || role === "synka_admin") return true;

      // Verificar nas permissões carregadas
      return permissoes.some(
        (p) =>
          p.ativo &&
          (p.recurso === "*" || p.recurso === recurso) &&
          (p.acao === "*" || p.acao === acao)
      );
    },
    [role, permissoes]
  );

  return { pode, permissoes, loading, role };
}
