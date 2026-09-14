import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = "",
  required,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[0.8125rem] font-semibold text-ice-dim">
        {label}
        {required && <span className="text-coral ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs text-coral-soft" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-[var(--radius-ctl)] border px-3 py-2 text-sm ${
        error ? "border-coral/40 bg-coral/10 text-coral-soft" : "border-cobalt/40 bg-cobalt/10 text-ice"
      }`}
    >
      {error ?? success}
    </div>
  );
}
