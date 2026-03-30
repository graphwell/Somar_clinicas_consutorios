import React from "react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  nome?: string;
  src?: string | null;
  size?: AvatarSize;
  color?: string;
  className?: string;
}

const sizeMap: Record<AvatarSize, { px: number; text: string }> = {
  sm: { px: 24, text: "text-[9px]" },
  md: { px: 32, text: "text-xs" },
  lg: { px: 40, text: "text-sm" },
  xl: { px: 48, text: "text-base" },
};

function hashColor(nome: string): string {
  const colors = [
    "linear-gradient(135deg,#40916C,#52B788)",
    "linear-gradient(135deg,#3B82F6,#60A5FA)",
    "linear-gradient(135deg,#C4973A,#E4B86A)",
    "linear-gradient(135deg,#8B5CF6,#A78BFA)",
    "linear-gradient(135deg,#E05C5C,#F87171)",
    "linear-gradient(135deg,#0891B2,#22D3EE)",
  ];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

export default function Avatar({
  nome = "?",
  src,
  size = "md",
  color,
  className = "",
}: AvatarProps) {
  const { px, text } = sizeMap[size];
  const bg = color || hashColor(nome);

  if (src) {
    return (
      <img
        src={src}
        alt={nome}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-medium text-white ${text} ${className}`}
      style={{ width: px, height: px, background: bg }}
      title={nome}
    >
      {initials(nome)}
    </div>
  );
}
