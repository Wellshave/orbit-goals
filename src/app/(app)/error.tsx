"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="deck p-8 max-w-lg" role="alert">
      <p className="t-eyebrow">Er ging iets mis</p>
      <h1 className="font-display text-2xl font-bold mt-1">Deze pagina kon niet geladen worden</h1>
      <p className="t-sub mt-2">{error.message || "Onbekende fout."}</p>
      <Button className="mt-5" onClick={reset}>Opnieuw proberen</Button>
    </div>
  );
}
