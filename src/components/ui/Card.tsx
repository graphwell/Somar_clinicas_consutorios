import React from "react";

type CardVariant = "default" | "elevated" | "outlined";

interface CardProps {
  variant?: CardVariant;
  hoverable?: boolean;
  clickable?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default:  "bg-white border border-warm-200 rounded-xl shadow-card",
  elevated: "bg-white border border-warm-200 rounded-xl shadow-card-hover",
  outlined: "bg-white border-2 border-warm-300 rounded-xl",
};

export default function Card({
  variant = "default",
  hoverable = false,
  clickable = false,
  className = "",
  children,
  onClick,
}: CardProps) {
  const hoverClass =
    hoverable || clickable
      ? "hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 cursor-pointer"
      : "";

  return (
    <div
      className={[variantClasses[variant], hoverClass, className]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
