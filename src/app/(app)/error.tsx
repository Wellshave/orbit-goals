"use client";

import { Button } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="card p-8 max-w-lg mt-6" role="alert">
      <ClayIcon name="sparkles" tone="coral" size="lg" className="mb-4" />
      <h1 className="text-2xl">{t("common.errorTitle")}</h1>
      <p className="t-muted mt-2">{error.message || t("common.unknownError")}</p>
      <Button className="mt-5" onClick={reset}>{t("common.retry")}</Button>
    </div>
  );
}
