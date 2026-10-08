"use server";
import { revalidatePath } from "next/cache";
import { errorMessage, type ActionResult } from "@/components/actions";
import { requireUser } from "@/lib/supabase/server";

/** Löscht Kontakt inkl. Nachrichten. Bei gesperrten Kontakten bleibt ein Hash auf der Sperrliste (DB-Trigger). */
export async function deleteContact(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const id = String(fd.get("contact_id"));
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("contacts").delete().eq("id", id).select("name, gesperrt").single();
    if (error) throw error;
    revalidatePath("/datenschutz");
    return { ok: `${data.name} gelöscht.${data.gesperrt ? " Die Sperre bleibt als Hash erhalten." : ""}` };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
