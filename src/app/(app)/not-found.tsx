import { ButtonLink } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="card p-8 max-w-lg mt-6">
      <ClayIcon name="lock" tone="grey" size="lg" className="mb-4" />
      <h1 className="text-2xl">{t("common.notFoundTitle")}</h1>
      <p className="t-muted mt-2">{t("common.notFoundBody")}</p>
      <ButtonLink href="/dashboard" className="mt-5" variant="secondary">{t("common.toToday")}</ButtonLink>
    </div>
  );
}
