import { PageHeader } from "@/components/ui";
import { ImportWizard } from "./wizard";

export default function ImportPage() {
  return (
    <>
      <PageHeader title="CSV-Import" />
      <div className="card mb-4 text-sm text-muted">
        <p>
          Trennzeichen <span className="num">;</span> oder <span className="num">,</span>. Erkannte Spalten:{" "}
          <span className="num text-fg">firma, ort, kanton, branche, groesse, website, quelle, erhebungsdatum, kanal, kontakt, funktion, email, linkedin</span>.
        </p>
        <p className="mt-2">Duplikate werden über die Domain erkannt (ohne Website: Name + Ort). Fehlt Quelle oder Datum in einer Zeile, gelten die Vorgaben unten. Freemail-Adressen werden nicht übernommen.</p>
      </div>
      <ImportWizard />
    </>
  );
}
