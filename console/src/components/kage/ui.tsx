import type { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-line bg-panel p-5", className)}>{children}</section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-mute">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  "min-h-11 rounded-xl border border-line bg-ink px-3 text-base text-paper outline-none focus:border-brass";

export function Primary({
  children,
  onClick,
  tone = "brass",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "brass" | "clay" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "brass"
      ? "bg-brass text-brass-ink hover:opacity-90"
      : tone === "clay"
        ? "bg-clay text-paper hover:opacity-90"
        : "border border-line bg-panel-2 text-paper hover:border-brass";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        toneClass,
      )}
    >
      {children}
    </button>
  );
}
