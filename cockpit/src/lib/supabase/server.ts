import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // In Server Components nicht setzbar; die Middleware erneuert die Sitzung.
        }
      },
    },
  });
}

/** Angemeldeter Nutzer mit zweitem Faktor, sonst Fehler. Für Server Actions und Routen. */
export async function requireUser() {
  const supabase = await createClient();
  // getClaims prüft die Signatur des Tokens; aal steht direkt in den Claims
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) throw new Error("Nicht angemeldet.");
  if (claims.aal !== "aal2") throw new Error("Zweiter Faktor erforderlich.");
  return { supabase, userId: claims.sub };
}
