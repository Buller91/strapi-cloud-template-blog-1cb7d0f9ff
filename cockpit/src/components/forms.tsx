"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "./actions";

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText = "…",
  confirm,
  ...rest
}: { children: React.ReactNode; className?: string; pendingText?: string; confirm?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || rest.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...rest}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** Formular mit Server Action, zeigt Erfolg oder Fehler darunter an. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: ActionResult }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>;
  if (state.ok) return <p className="mt-2 text-sm text-accent">{state.ok}</p>;
  return null;
}

export function CopyButton({ text, label = "Kopieren" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Kopiert" : label}
    </button>
  );
}
