import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { totp } from "@/lib/totp";

// Nur für den lokalen Start (npm run lokal): meldet ALLOWED_EMAIL ohne Mail und
// ohne Authenticator-App an, inklusive zweitem Faktor. Im Produktivbetrieb aus.
const SECRET_FILE = path.join(process.cwd(), ".dev-totp-secret");

function enabled(request: NextRequest): boolean {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_LOGIN === "1" &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    ["localhost", "127.0.0.1"].includes(host)
  );
}

export async function GET(request: NextRequest) {
  if (!enabled(request)) return new NextResponse("Nicht gefunden", { status: 404 });
  const to = (p: string) => NextResponse.redirect(new URL(p, env.appUrl()));

  const admin = createAdminClient(env.supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: env.allowedEmail() });
  if (linkError) return new NextResponse(`Anmeldelink fehlgeschlagen: ${linkError.message}`, { status: 500 });

  const supabase = await createClient();
  const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (otpError) return new NextResponse(`Anmeldung fehlgeschlagen: ${otpError.message}`, { status: 500 });

  // Zweiter Faktor: beim ersten Mal lokal einrichten und das Geheimnis in .dev-totp-secret ablegen
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  let factorId = factors?.totp[0]?.id;
  let secret = await readFile(SECRET_FILE, "utf8").then((s) => s.trim(), () => null);

  if (!factorId) {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Lokal" });
    if (error) return new NextResponse(`Zweiter Faktor fehlgeschlagen: ${error.message}`, { status: 500 });
    factorId = data.id;
    secret = data.totp.secret;
    await writeFile(SECRET_FILE, secret, { mode: 0o600 });
  }
  // Faktor existiert, aber Geheimnis unbekannt (z. B. per App eingerichtet): Code manuell eingeben
  if (!secret) return to("/mfa/pruefen");

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: totp(secret) });
  if (verifyError) return to("/mfa/pruefen");
  return to("/");
}
