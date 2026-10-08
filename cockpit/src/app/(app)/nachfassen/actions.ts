"use server";
import { revalidatePath } from "next/cache";
import { errorMessage, type ActionResult } from "@/components/actions";
import { requireUser } from "@/lib/supabase/server";

export async function completeFollowUp(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("follow_ups").update({ erledigt: true }).eq("id", String(fd.get("id")));
    if (error) throw error;
    revalidatePath("/nachfassen");
    revalidatePath("/");
    return { ok: "Erledigt." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function rescheduleFollowUp(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const due = String(fd.get("faellig_am"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Datum ungültig." };
    const { supabase } = await requireUser();
    const { error } = await supabase.from("follow_ups").update({ faellig_am: due }).eq("id", String(fd.get("id")));
    if (error) throw error;
    revalidatePath("/nachfassen");
    revalidatePath("/");
    return { ok: "Verschoben." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
