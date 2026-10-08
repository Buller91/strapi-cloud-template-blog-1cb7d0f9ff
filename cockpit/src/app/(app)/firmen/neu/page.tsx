import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, PageHeader } from "@/components/ui";
import { CHANNELS, CHANNEL_LABELS, KANTONE } from "@/lib/domain/types";
import { zurichDate } from "@/lib/domain/workdays";
import { createAccount } from "../actions";
import { ContactFields } from "../contact-fields";

export default function NeueFirmaPage() {
  return (
    <>
      <PageHeader title="Neue Zielfirma" />
      <ActionForm action={createAccount} className="space-y-6">
        <section className="card grid gap-3 sm:grid-cols-2">
          <Field label="Firmenname"><input className="input" name="name" required /></Field>
          <Field label="Website" hint="Wird für die Duplikaterkennung verwendet."><input className="input" name="website" placeholder="muster-elektro.ch" /></Field>
          <Field label="Ort"><input className="input" name="ort" /></Field>
          <Field label="Kanton">
            <select className="input" name="kanton" defaultValue="">
              <option value="">–</option>
              {KANTONE.map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Branche"><input className="input" name="branche" placeholder="Elektriker, Dachbau …" list="branchen" /></Field>
          <datalist id="branchen"><option>Elektriker</option><option>Dachbau</option><option>Sanitär</option><option>Schreinerei</option><option>Malerei</option><option>Holzbau</option></datalist>
          <Field label="Grösse ca."><input className="input" name="groesse_ca" placeholder="5–10 MA" /></Field>
          <Field label="Quelle (Pflicht)"><input className="input" name="quelle" required placeholder="Zefix, Google Maps, Empfehlung …" /></Field>
          <Field label="Erhebungsdatum (Pflicht)"><input className="input" type="date" name="quelle_datum" required defaultValue={zurichDate()} /></Field>
          <Field label="Herkunftskanal">
            <select className="input" name="herkunftskanal" defaultValue="ausgehend">
              {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
            </select>
          </Field>
        </section>
        <section className="card space-y-3">
          <h2 className="font-semibold">Kontakt (optional)</h2>
          <ContactFields prefix="k_" required={false} />
        </section>
        <SubmitButton pendingText="Speichere …">Anlegen</SubmitButton>
      </ActionForm>
    </>
  );
}
