import { PRODUCT_NAME } from "@/lib/product";
import { OrbitMark } from "@/components/orbit/orbit-mark";
import { ClayIcon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { LanguageToggle } from "@/components/shell/language-toggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  return (
    <I18nProvider locale={locale}>
      <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
        <aside className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden" style={{ background: "linear-gradient(160deg, #ECE5FF 0%, #DDE9FF 45%, #DDF7EF 100%)" }}>
          <div className="flex items-center gap-3"><OrbitMark className="size-9" /><span className="font-display font-extrabold text-xl">{PRODUCT_NAME}</span></div>
          <div className="max-w-md">
            <div className="flex gap-3 mb-6">
              <ClayIcon name="rocket" tone="coral" size="lg" className="float" />
              <ClayIcon name="flag" tone="yellow" size="lg" className="float [animation-delay:0.6s]" />
              <ClayIcon name="collab" tone="mint" size="lg" className="float [animation-delay:1.2s]" />
            </div>
            <h1 className="text-5xl">{t("auth.heroTitle")}</h1>
            <p className="mt-5 text-ink-2 text-lg leading-relaxed">{t("auth.heroBody")}</p>
          </div>
          <p className="text-sm t-muted">{t("auth.privateNote")}</p>
        </aside>
        <main className="flex items-center justify-center p-6 sm:p-10 relative">
          <div className="absolute top-4 right-4"><LanguageToggle compact /></div>
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2.5 mb-8 lg:hidden"><OrbitMark className="size-8" /><span className="font-display font-extrabold text-lg">{PRODUCT_NAME}</span></div>
            {children}
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
