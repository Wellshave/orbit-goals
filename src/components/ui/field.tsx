import type { ReactNode } from "react";

export function Field({ label, htmlFor, hint, error, children, className = "", required }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-coral ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs t-muted">{hint}</p>}
      {error && <p className="text-xs text-coral-deep font-medium" role="alert">{error}</p>}
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <div role={error ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-medium ${error ? "bg-peach text-coral-deep" : "bg-mintsoft text-mint-deep"}`}>
      {error ?? success}
    </div>
  );
}
