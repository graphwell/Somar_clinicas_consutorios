"use client";
import React, { useEffect, useRef, useState } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string; // ex: '560px', '480px' — valor CSS direto
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "560px",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar mobile no cliente
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Bloquear scroll do body enquanto modal aberto
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
    /* OVERLAY — scroll aqui, não no painel */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "flex-start",
        justifyContent: "center",
        padding: isMobile ? "0" : "32px 16px",
        overflowY: "auto",
        background: "rgba(27,43,58,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      } as React.CSSProperties}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* PAINEL — altura natural, não fixo, sem max-h */}
      <div
        ref={panelRef}
        style={{
          background: "white",
          borderRadius: isMobile ? "20px 20px 0 0" : "20px",
          width: "100%",
          maxWidth: isMobile ? "100%" : maxWidth,
          marginTop: isMobile ? undefined : "auto",
          marginBottom: isMobile ? undefined : "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle mobile */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 40, height: 4, background: "#D1C9BE", borderRadius: 9999 }} />
          </div>
        )}

        {/* HEADER */}
        {title && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #EEE9DF",
          }}>
            <h2 style={{ fontFamily: "var(--font-display, inherit)", fontSize: 16, fontWeight: 700, color: "#374151", margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, border: "none", background: "transparent",
                color: "#9CA3AF", cursor: "pointer",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F3F0EB"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* CONTEÚDO — altura natural, sem overflow */}
        <div style={{ padding: "20px 24px" }}>
          {children}
        </div>

        {/* FOOTER — sempre visível pois o scroll é no overlay */}
        {footer && (
          <div style={{
            padding: `12px 24px ${isMobile ? `calc(20px + env(safe-area-inset-bottom, 0px))` : "20px"}`,
            borderTop: "1px solid #EEE9DF",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
