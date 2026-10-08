import { ActionForm, SubmitButton } from "@/components/forms";
import { requestMagicLink } from "./actions";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Cybershark" className="mb-8 h-8 w-auto self-start" />
      <div className="card space-y-4">
        <h1 className="text-xl font-bold">Anmelden</h1>
        <ActionForm action={requestMagicLink} className="space-y-3">
          <input className="input" type="email" name="email" required autoComplete="email" placeholder="E-Mail" />
          <SubmitButton className="btn btn-primary w-full" pendingText="Sende …">Anmeldelink senden</SubmitButton>
        </ActionForm>
        <p className="text-xs text-muted">Danach wird der Code aus der Authenticator-App abgefragt.</p>
      </div>
    </div>
  );
}
