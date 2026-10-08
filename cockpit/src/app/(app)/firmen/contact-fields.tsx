import { Field } from "@/components/ui";
import { zurichDate } from "@/lib/domain/workdays";

/** Felder für einen Kontakt. prefix erlaubt das Einbetten ins Firmenformular. */
export function ContactFields({ prefix = "", required = true }: { prefix?: string; required?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Name"><input className="input" name={`${prefix}name`} required={required} /></Field>
      <Field label="Funktion"><input className="input" name={`${prefix}funktion`} placeholder="Inhaber, Geschäftsführerin …" /></Field>
      <Field label="E-Mail (geschäftlich)"><input className="input" type="email" name={`${prefix}email_geschaeftlich`} /></Field>
      <Field label="LinkedIn-URL"><input className="input" name={`${prefix}linkedin_url`} placeholder="https://www.linkedin.com/in/…" /></Field>
      <Field label="Quelle (Pflicht)"><input className="input" name={`${prefix}quelle`} placeholder="Firmenwebsite, Impressum" required={required} /></Field>
      <Field label="Erhebungsdatum"><input className="input" type="date" name={`${prefix}quelle_datum`} defaultValue={zurichDate()} required={required} /></Field>
      <label className="flex items-start gap-2 text-xs text-muted sm:col-span-2">
        <input type="checkbox" name={`${prefix}geschaeftlich_bestaetigt`} className="mt-0.5" />
        Bei Freemail-Adressen (gmail, bluewin …): Ich bestätige, dass die Adresse öffentlich als geschäftliche Adresse angegeben ist.
      </label>
    </div>
  );
}
