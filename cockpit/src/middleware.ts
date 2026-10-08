import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/auth/callback", "/auth/dev-login"];
const MFA = ["/mfa/einrichten", "/mfa/pruefen"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const path = request.nextUrl.pathname;
  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    const r = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) r.cookies.set(c);
    return r;
  };

  // getClaims prüft die Signatur des Tokens und erneuert die Sitzung bei Bedarf
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (PUBLIC.some((p) => path.startsWith(p))) return response;
  if (!claims) return redirect("/login");

  const allowed = (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();
  if (!allowed || String(claims.email ?? "").toLowerCase() !== allowed) {
    await supabase.auth.signOut();
    return redirect("/login");
  }

  const onMfaPage = MFA.some((p) => path.startsWith(p));
  if (claims.aal === "aal2") return onMfaPage ? redirect("/") : response;

  // Noch kein zweiter Faktor bestätigt: einrichten oder prüfen
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const target = factors?.totp.length ? "/mfa/pruefen" : "/mfa/einrichten";
  return path === target ? response : redirect(target);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|woff2?)$).*)"],
};
