"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import type { Profile } from "@/lib/types";

export function AvatarUploader({ profile }: { profile: Profile }) {
  const [url, setUrl] = useState(profile.avatar_url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFile(file: File) {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Kies een PNG-, JPG- of WebP-bestand.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Maximaal 5 MB.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setError(`Uploaden mislukt: ${upErr.message}`);
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
    if (dbErr) setError(dbErr.message);
    else {
      setUrl(data.publicUrl);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={profile.full_name || profile.email} src={url} size="xl" />
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </span>
        )}
      </div>
      <div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          aria-label="Profielfoto kiezen"
        />
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="press inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-white border border-line-strong hover:bg-cloud">
          <Camera className="size-4" aria-hidden />
          {url ? "Profielfoto wijzigen" : "Profielfoto uploaden"}
        </button>
        <p className="text-xs t-muted mt-1.5">PNG, JPG of WebP · max 5 MB</p>
        {error && (
          <p className="text-xs text-coral-deep mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
