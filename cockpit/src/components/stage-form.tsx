"use client";
import { useActionState, useState } from "react";
import { changeStage } from "@/app/(app)/firmen/actions";
import { allowedTransitions, needsFollowUp } from "@/lib/domain/pipeline";
import { STAGE_LABELS, type Stage } from "@/lib/domain/types";
import { FormMessage, SubmitButton } from "./forms";

/** Stufenwechsel; bei «kontaktiert» wird ein Nachfass-Datum (+5 Werktage) vorgeschlagen. */
export function StageForm({ accountId, stage, followUpSuggestion, compact }: {
  accountId: string;
  stage: Stage;
  followUpSuggestion: string;
  compact?: boolean;
}) {
  const [state, action] = useActionState(changeStage, null);
  const [to, setTo] = useState<string>("");
  const options = allowedTransitions(stage);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="account_id" value={accountId} />
      <div className="flex gap-2">
        <select
          name="status"
          className={`input ${compact ? "py-1 text-xs" : ""}`}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Stufe wechseln"
        >
          <option value="">Verschieben nach …</option>
          {options.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <SubmitButton className={`btn btn-primary ${compact ? "btn-sm" : ""}`} disabled={!to}>OK</SubmitButton>
      </div>
      {to && needsFollowUp(to as Stage) ? (
        <label className="flex items-center gap-2 text-xs text-muted">
          Nachfassen am
          <input type="date" name="faellig_am" defaultValue={followUpSuggestion} className="input w-auto py-1 text-xs" />
        </label>
      ) : null}
      <FormMessage state={state} />
    </form>
  );
}
