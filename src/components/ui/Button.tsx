"use client";
import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-sage-500 text-white hover:bg-sage-700 shadow-sage hover:-translate-y-px active:scale-[0.97]",
  secondary:
    "border border-sage-500 text-sage-700 hover:bg-sage-50 active:scale-[0.97]",
  ghost:
    "text-slate-300 hover:bg-warm-200 active:scale-[0.97]",
  danger:
    "border border-red-400 text-red-600 hover:bg-red-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded",
  md: "h-9 px-4 text-sm rounded-md",
  lg: "h-11 px-5 text-sm rounded-lg",
  xl: "h-12 px-6 text-base rounded-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-2",
        "font-sans font-medium transition-all duration-150",
        "min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400",
        variantClasses[variant],
        sizeClasses[size],
        isDisabled ? "opacity-70 cursor-not-allowed" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading && (
        <svg
          className="animate-spin w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
