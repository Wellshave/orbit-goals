import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="deck p-8 max-w-lg">
      <p className="t-eyebrow">404</p>
      <h1 className="font-display text-2xl font-bold mt-1">Niet gevonden of geen toegang</h1>
      <p className="t-sub mt-2">Dit item bestaat niet, of je hebt geen rechten om het te zien. Privédoelen van anderen zijn nooit zichtbaar.</p>
      <ButtonLink href="/dashboard" className="mt-5" variant="secondary">Naar mijn dashboard</ButtonLink>
    </div>
  );
}
