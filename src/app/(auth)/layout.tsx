import { PRODUCT_NAME } from "@/lib/product";
import { OrbitMark } from "@/components/orbit/orbit-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      <aside className="hidden lg:flex relative flex-col justify-between p-10 overflow-hidden border-r border-line">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(800px_500px_at_30%_30%,rgba(73,108,255,0.22),transparent_60%),radial-gradient(600px_400px_at_80%_90%,rgba(149,103,232,0.18),transparent_60%)]" />
        <div className="flex items-center gap-3">
          <OrbitMark className="size-8" />
          <span className="font-display font-bold text-lg tracking-tight">{PRODUCT_NAME}</span>
        </div>
        <div className="max-w-md">
          <p className="t-eyebrow mb-3">Performance cockpit</p>
          <h1 className="t-display text-5xl">Doelen die je team vooruit trekken.</h1>
          <p className="mt-5 text-ice-dim leading-relaxed">
            Company goals, teamdoelen en persoonlijke targets in één ruimte. Milestones die zichzelf herkennen, KPI-check-ins in seconden en een scorebord dat bijdragen eerlijk weegt.
          </p>
        </div>
        <p className="text-xs text-muted">Privédoelen blijven privé. Altijd.</p>
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <OrbitMark className="size-7" />
            <span className="font-display font-bold text-lg">{PRODUCT_NAME}</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
