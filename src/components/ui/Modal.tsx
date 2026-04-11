"use client";
import React, { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Bloquear scroll do body
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Scroll para o topo ao abrir
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.scrollTop = 0;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(27,43,58,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {/* Painel */}
      <div
        ref={panelRef}
        className={[
          "relative m-auto bg-white w-full flex flex-col",
          "rounded-2xl max-h-[92vh]",
          "sm:max-h-[calc(100vh-48px)]",
          "shadow-2xl overflow-hidden",
          maxWidth,
        ].join(" ")}
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle mobile */}
        <div className="flex justify-center pt-3 flex-shrink-0 sm:hidden">
          <div className="w-10 h-1 bg-warm-300 rounded-full" />
        </div>

        {/* Header — fixo, não scrolla */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-warm-200 flex-shrink-0 sticky top-0 bg-white z-10">
            <h2 className="font-display text-lg text-slate-700">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-warm-200 hover:text-slate-700 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body — scrolla quando necessário */}
        <div
          className="flex-1 overflow-y-auto min-h-0 px-5 py-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#EEE9DF transparent" } as React.CSSProperties}
        >
          {children}
        </div>

        {/* Footer — fixo, não scrolla */}
        {footer && (
          <div className="px-5 pb-5 pt-3 border-t border-warm-200 flex justify-end gap-2 flex-shrink-0 bg-white sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
