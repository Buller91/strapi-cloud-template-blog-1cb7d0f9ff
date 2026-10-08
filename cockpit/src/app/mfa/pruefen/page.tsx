"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function MfaVerifyPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp[0];
    if (!totp) {
      window.location.href = "/mfa/einrichten";
      return;
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: code.trim() });
    setBusy(false);
    if (error) setError("Code ungültig.");
    else window.location.href = "/";
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <form onSubmit={verify} className="card space-y-4">
        <h1 className="text-xl font-bold">Code eingeben</h1>
        <input className="input num text-center text-lg tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" required />
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Prüfe …" : "Weiter"}</button>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
    </div>
  );
}
