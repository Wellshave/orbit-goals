"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useActionPending } from "./form";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "mint" | "soft";
type Size = "sm" | "md" | "lg";

const base = "press inline-flex items-center justify-center gap-2 font-semibold rounded-full disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white shadow-[0_10px_24px_-10px_rgba(91,108,255,0.8),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-blue-deep",
  mint: "bg-mint text-ink shadow-[0_10px_24px_-10px_rgba(72,207,174,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-mint-deep hover:text-white",
  secondary: "bg-white text-ink border border-line-strong shadow-[var(--shadow-press)] hover:border-ink/25 hover:bg-cloud",
  soft: "bg-sky text-blue-deep hover:bg-blue hover:text-white",
  ghost: "text-ink-2 hover:text-ink hover:bg-cloud",
  danger: "bg-peach text-coral-deep hover:bg-coral hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "text-[0.8125rem] px-3.5 py-2",
  md: "text-sm px-4.5 py-2.5",
  lg: "text-base px-6 py-3",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function SubmitButton({ children, pendingText, variant = "primary", size = "md", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; variant?: Variant; size?: Size }) {
  const status = useFormStatus();
  const ctxPending = useActionPending();
  const pending = status.pending || ctxPending;
  return (
    <button type="submit" className={buttonClass(variant, size, className)} disabled={pending} aria-busy={pending} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", size = "md", className = "", children, ...props }: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
