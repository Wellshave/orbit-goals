import { ButtonLink } from "@/components/ui";
import { ClayIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="card p-8 max-w-lg mt-6">
      <ClayIcon name="lock" tone="grey" size="lg" className="mb-4" />
      <h1 className="text-2xl">Niet gevonden of geen toegang</h1>
      <p className="t-muted mt-2">Dit item bestaat niet, of je hebt geen rechten om het te zien. Privédoelen van anderen zijn nooit zichtbaar.</p>
      <ButtonLink href="/dashboard" className="mt-5" variant="secondary">Naar vandaag</ButtonLink>
    </div>
  );
}
