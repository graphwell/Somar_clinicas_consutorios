import React from 'react';

interface SynkaLogoProps {
  iconSize?: number;       // size of the icon mark in px
  showName?: boolean;      // show the "synka" wordmark
  nameSize?: string;       // tailwind text-* class
  className?: string;
}

/** Pure SVG Synka icon — transparent background, works on any surface */
export function SynkaIcon({ size = 36, className = '', useImage = false }: { size?: number; className?: string; useImage?: boolean }) {
  if (useImage) {
    return <img src="/icon-192.png" alt="Synka" width={size} height={size} className={className} />;
  }
  const id = `synka-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00c6e0" />
          <stop offset="100%" stopColor="#4a4ae2" />
        </linearGradient>
      </defs>

      {/* 3×3 calendar grid dots */}
      {[6, 14, 22].map(cx =>
        [6, 14, 22].map(cy => (
          <rect
            key={`${cx}-${cy}`}
            x={cx - 2.5}
            y={cy - 2.5}
            width={5}
            height={5}
            rx={1.2}
            fill={`url(#${id})`}
            opacity={0.85}
          />
        ))
      )}

      {/* Bold swooping checkmark */}
      <path
        d="M 8 24 C 12 22, 15 26, 18 20 C 22 12, 28 8, 34 6"
        stroke={`url(#${id})`}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Full Synka wordmark: icon + "synka" text */
export function SynkaLogo({ iconSize = 36, showName = true, nameSize = 'text-xl', className = '' }: SynkaLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SynkaIcon size={iconSize} />
      {showName && (
        <span className={`font-extrabold tracking-tight bg-gradient-to-r from-[#00c6e0] to-[#8080ff] bg-clip-text text-transparent ${nameSize}`}>
          synka
        </span>
      )}
    </div>
  );
}
