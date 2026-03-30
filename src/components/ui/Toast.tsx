"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

const variantConfig: Record<ToastVariant, { icon: string; classes: string }> = {
  success: {
    icon: "✓",
    classes: "bg-sage-500 text-white",
  },
  error: {
    icon: "✕",
    classes: "bg-red-500 text-white",
  },
  warning: {
    icon: "⚠",
    classes: "bg-gold-500 text-white",
  },
  info: {
    icon: "ℹ",
    classes: "bg-blue-500 text-white",
  },
};

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), 4000);
    return () => clearTimeout(t);
  }, [item.id, onRemove]);

  const cfg = variantConfig[item.variant];
  return (
    <div
      className={[
        "flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-card-hover",
        "text-sm font-medium slide-in-right",
        cfg.classes,
      ].join(" ")}
      style={{ minWidth: 220, maxWidth: 360 }}
    >
      <span className="text-base leading-none">{cfg.icon}</span>
      <span className="flex-1">{item.message}</span>
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-70 hover:opacity-100 transition-opacity ml-1"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((variant: ToastVariant, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, variant, message }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => add("success", msg),
    error:   (msg: string) => add("error", msg),
    warning: (msg: string) => add("warning", msg),
    info:    (msg: string) => add("info", msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Desktop: canto inferior direito | Mobile: acima da bottom nav */}
      <div className="fixed z-[9999] flex flex-col gap-2 items-end
                      bottom-4 right-4
                      lg:bottom-4 lg:right-4
                      bottom-[72px] right-4 lg:bottom-4">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}

export default ToastProvider;
