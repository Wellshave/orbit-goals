"use client";

import { Button } from "@/components/ui";
import { ClayIcon } from "@/components/icons";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card p-8 max-w-lg mt-6" role="alert">
      <ClayIcon name="sparkles" tone="coral" size="lg" className="mb-4" />
      <h1 className="text-2xl">Dit ging even mis</h1>
      <p className="t-muted mt-2">{error.message || "Onbekende fout."}</p>
      <Button className="mt-5" onClick={reset}>Opnieuw proberen</Button>
    </div>
  );
}
