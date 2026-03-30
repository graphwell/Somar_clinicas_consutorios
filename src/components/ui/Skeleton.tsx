import React from "react";

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-4/5", "w-3/5", "w-full", "w-2/3"];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton h-4 ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-warm-200 rounded-xl shadow-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      </div>
      <SkeletonLines lines={2} />
    </div>
  );
}

export default Skeleton;
