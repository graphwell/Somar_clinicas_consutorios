import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

export default function Input({
  label,
  error,
  hint,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-300 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={[
          "w-full h-10 px-3 bg-white border rounded-lg text-sm text-slate-700",
          "focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500",
          "transition-all placeholder:text-slate-100",
          error ? "border-red-400" : "border-warm-300",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-100 mt-1">{hint}</p>
      )}
    </div>
  );
}
