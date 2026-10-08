import "server-only";
import type { Sender } from "./domain/draft-rules";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Umgebungsvariable ${name} fehlt (siehe .env.example).`);
  return v;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  allowedEmail: () => required("ALLOWED_EMAIL").trim().toLowerCase(),
  appUrl: () => process.env.APP_URL ?? "http://localhost:3000",
  anthropicModel: () => process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  offerText: () =>
    process.env.OFFER_TEXT ||
    "Kostenloser Sichtbarkeits-Check: Ich zeige in 15 Minuten, wie Ihr Betrieb bei Google gefunden wird.",
  sender: (): Sender => ({
    name: required("SENDER_NAME"),
    firma: process.env.SENDER_FIRMA ?? "Cybershark",
    adresse: required("SENDER_ADRESSE"),
    email: required("SENDER_EMAIL"),
    web: process.env.SENDER_WEB ?? "https://cybershark.ch",
  }),
};
