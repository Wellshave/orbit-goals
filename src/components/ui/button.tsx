"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "orchid";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-ctl)] transition-[transform,background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out-quint)] active:translate-y-px disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-cobalt text-white shadow-[0_8px_20px_-10px_rgba(73,108,255,0.9),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-cobalt-soft",
  orchid:
    "bg-orchid text-white shadow-[0_8px_20px_-10px_rgba(149,103,232,0.9),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-orchid-soft",
  secondary:
    "bg-midnight-2 text-ice border border-line-strong hover:border-ice/30 hover:bg-midnight-3",
  ghost: "text-ice-dim hover:text-ice hover:bg-ice/5",
  danger: "bg-coral/15 text-coral-soft border border-coral/40 hover:bg-coral/25",
};

const sizes: Record<Size, string> = {
  sm: "text-[0.8125rem] px-2.5 py-1.5",
  md: "text-sm px-3.5 py-2",
  lg: "text-[0.9375rem] px-5 py-2.5",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; variant?: Variant; size?: Size }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={buttonClass(variant, size, className)} disabled={pending} aria-busy={pending} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
