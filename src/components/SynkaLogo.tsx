import React from 'react';

interface SynkaLogoProps {
  variant?: 'light' | 'dark';
  // light: fundo claro  → logo original (sem filtro)
  // dark:  fundo escuro → logo branca (filter invert)
  height?: number;
  className?: string;
}

/** Logo Synka usando a imagem /synka-logo.png.
 *  variant="dark"  → aplica brightness(0) invert(1) para fundos escuros
 *  variant="light" → logo original para fundos claros (padrão)
 */
export function SynkaLogo({ variant = 'light', height = 36, className }: SynkaLogoProps) {
  const filter = variant === 'dark' ? 'brightness(0) invert(1)' : 'none';

  return (
    <img
      src="/synka-logo.png"
      alt="Synka"
      style={{
        height: `${height}px`,
        width: 'auto',
        objectFit: 'contain',
        background: 'transparent',
        filter,
      }}
      className={className}
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = 'none';
        const span = document.createElement('span');
        span.textContent = 'Synka';
        span.style.cssText = `
          font-family: var(--font-display, serif);
          font-size: ${height * 0.6}px;
          font-weight: 600;
          color: inherit;
        `;
        el.parentNode?.insertBefore(span, el);
      }}
    />
  );
}

/** Ícone quadrado compacto da Synka */
export function SynkaIcon({ size = 36, className = '' }: { size?: number; className?: string; useImage?: boolean }) {
  return (
    <div
      className={`rounded-xl flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #40916C, #52B788)',
        fontSize: Math.round(size * 0.4),
      }}
    >
      S
    </div>
  );
}
