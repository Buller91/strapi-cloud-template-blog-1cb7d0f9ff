"use client";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import type { ImportPlan } from "@/lib/domain/csv-import";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/domain/types";
import { commitImport, previewImport } from "../actions";

export function ImportWizard() {
  const [preview, previewAction] = useActionState(previewImport, null);
  const [result, commitAction] = useActionState(commitImport, null);
  const [defaults] = useState(() => new Date().toISOString().slice(0, 10));
  const data = preview?.data as { plan: ImportPlan; csv: string; defaults: Record<string, string> } | undefined;

  return (
    <div className="space-y-4">
      <form action={previewAction} className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1"><span className="label">Quelle (Vorgabe)</span><input className="input" name="quelle" placeholder="z. B. Eigene Recherche Google Maps" /></label>
          <label className="space-y-1"><span className="label">Erhebungsdatum (Vorgabe)</span><input className="input" type="date" name="quelle_datum" defaultValue={defaults} required /></label>
          <label className="space-y-1">
            <span className="label">Herkunftskanal</span>
            <select className="input" name="herkunftskanal" defaultValue="ausgehend">
              {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
            </select>
          </label>
        </div>
        <input type="file" name="datei" accept=".csv,text/csv" className="block text-sm" />
        <textarea className="input num min-h-32 text-xs" name="csv" placeholder="…oder CSV hier einfügen" />
        <SubmitButton className="btn" pendingText="Prüfe …">Vorschau</SubmitButton>
        <FormMessage state={preview?.error ? preview : null} />
      </form>

      {data ? (
        <div className="card space-y-4">
          <div className="flex flex-wrap gap-6">
            <Stat n={data.plan.neu.length} label="neu" accent />
            <Stat n={data.plan.duplikate.length} label="Duplikate" />
            <Stat n={data.plan.fehler.length} label="Fehler" />
            <Stat n={data.plan.warnungen.length} label="Hinweise" />
          </div>
          <List title="Neu" items={data.plan.neu.map((r) => `Z. ${r.zeile}: ${r.name} – ${r.dedupe_key}${r.kontakt ? ` (Kontakt: ${r.kontakt.name})` : ""}`)} />
          <List title="Duplikate" items={data.plan.duplikate.map((d) => `Z. ${d.zeile}: ${d.name} – ${d.schluessel} (${d.grund === "datei" ? "doppelt in Datei" : "bereits vorhanden"})`)} />
          <List title="Fehler" items={data.plan.fehler.map((f) => `Z. ${f.zeile}: ${f.meldung}`)} danger />
          <List title="Hinweise" items={data.plan.warnungen.map((w) => `Z. ${w.zeile}: ${w.meldung}`)} />

          <form action={commitAction}>
            {/* Gleiche Eingaben erneut senden; der Server plant gegen den aktuellen Stand neu */}
            <PreviewFields csv={data.csv} defaults={data.defaults} />
            <SubmitButton pendingText="Importiere …" disabled={data.plan.neu.length === 0}>
              {data.plan.neu.length} Firmen importieren
            </SubmitButton>
            <FormMessage state={result} />
          </form>
        </div>
      ) : null}
    </div>
  );
}

function PreviewFields({ csv, defaults }: { csv: string; defaults: Record<string, string> }) {
  return (
    <>
      <input type="hidden" name="csv" value={csv} />
      {Object.entries(defaults).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
    </>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`num text-2xl ${accent ? "text-accent" : ""}`}>{n}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function List({ title, items, danger }: { title: string; items: string[]; danger?: boolean }) {
  if (!items.length) return null;
  return (
    <details open={danger}>
      <summary className="label cursor-pointer">{title} ({items.length})</summary>
      <ul className={`mt-2 max-h-60 space-y-1 overflow-auto text-xs ${danger ? "text-danger" : "text-muted"}`}>
        {items.map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </details>
  );
}
