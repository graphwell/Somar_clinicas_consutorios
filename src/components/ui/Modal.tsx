"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  maxWidth = "560px",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ESC
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Não renderiza no servidor nem antes de montar
  if (!mounted || !open) return null;

  const modal = (
    /* OVERLAY — position:fixed relativo ao viewport real (via Portal) */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : "16px",
        background: "rgba(27,43,58,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      } as React.CSSProperties}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* PAINEL */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "white",
          borderRadius: isMobile ? "20px 20px 0 0" : "20px",
          width: "100%",
          maxWidth: isMobile ? "100%" : maxWidth,
          maxHeight: isMobile ? "92vh" : "calc(100vh - 32px)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle mobile */}
        {isMobile && (
          <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
            <div style={{ width: 40, height: 4, background: "#D1C9BE", borderRadius: 9999 }} />
          </div>
        )}

        {/* HEADER — flex-shrink:0, não comprime */}
        {title && (
          <div style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #EEE9DF",
            background: "white",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, border: "none", background: "transparent",
                color: "#9CA3AF", cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* CONTEÚDO — flex:1 + overflow-y:auto + min-height:0 (tríade obrigatória) */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: "20px 24px",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}>
          {children}
        </div>

        {/* FOOTER — flex-shrink:0, sempre visível */}
        {footer && (
          <div style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 24px",
            paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
            borderTop: "1px solid #EEE9DF",
            background: "white",
          } as React.CSSProperties}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Portal: renderiza direto no document.body, fora de qualquer transform/overflow pai
  return createPortal(modal, document.body);
}
