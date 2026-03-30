import React from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-sage-100 text-sage-700",
  warning: "bg-gold-100 text-gold-500",
  danger:  "bg-red-100 text-red-600",
  info:    "bg-blue-100 text-blue-600",
  neutral: "bg-warm-200 text-slate-300",
};

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 h-5 px-2",
        "text-[11px] font-medium rounded-full",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
