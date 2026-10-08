"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function MfaEnrollPage() {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      // Unvollständige frühere Versuche entfernen
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator" });
      if (error) setError(error.message);
      else setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factor) return;
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (error) setError("Code ungültig, bitte erneut versuchen.");
    else window.location.href = "/";
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="card space-y-4">
        <h1 className="text-xl font-bold">Zweiten Faktor einrichten</h1>
        <p className="text-sm text-muted">QR-Code mit einer Authenticator-App scannen und den sechsstelligen Code eingeben.</p>
        {factor ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={factor.qr} alt="QR-Code" className="mx-auto h-48 w-48 rounded bg-white p-2" />
            <p className="label break-all">Schlüssel: {factor.secret}</p>
            <form onSubmit={verify} className="space-y-3">
              <input className="input num" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required />
              <button className="btn btn-primary w-full">Bestätigen</button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted">Lade …</p>
        )}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
