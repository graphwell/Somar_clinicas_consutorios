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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        style={{ animation: "fade-up 0.15s ease both" }}
        onClick={onClose}
      />

      {/* Painel */}
      <div
        ref={panelRef}
        className={[
          "relative bg-white w-full z-10",
          "rounded-t-2xl sm:rounded-2xl shadow-2xl",
          "sm:mx-4 sm:my-4",
          maxWidth,
          "sm:slide-in-right",
          "slide-up sm:animate-none",
        ].join(" ")}
        style={{
          animation: "slide-up 0.3s ease both",
        }}
      >
        {/* Handle mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-warm-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-warm-200">
            <h2 className="font-display text-lg text-slate-700">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-100 hover:bg-warm-200 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 pb-5 pt-2 border-t border-warm-200 flex justify-end gap-2 safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
