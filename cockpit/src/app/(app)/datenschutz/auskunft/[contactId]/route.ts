import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

/** Auskunft: alle zu einem Kontakt gespeicherten Daten als JSON. */
export async function GET(_: Request, { params }: { params: Promise<{ contactId: string }> }) {
  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch {
    return new NextResponse("Nicht angemeldet", { status: 401 });
  }
  const { contactId } = await params;
  const { data: contact } = await supabase
    .from("contacts")
    .select("*, accounts(name, ort, website, quelle, quelle_datum), messages(kanal, final, status, gesendet_am, erstellt_am)")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return new NextResponse("Nicht gefunden", { status: 404 });
  const body = {
    erstellt: new Date().toISOString(),
    verantwortlich: process.env.SENDER_FIRMA ?? "Cybershark",
    hinweis: "Gespeichert sind nur geschäftliche Angaben. Herkunft siehe Feld «quelle» und «quelle_datum».",
    kontakt: contact,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="auskunft-${contactId}.json"`,
      "cache-control": "no-store",
    },
  });
}
