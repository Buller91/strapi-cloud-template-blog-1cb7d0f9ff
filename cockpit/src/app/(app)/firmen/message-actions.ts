"use server";
import { revalidatePath } from "next/cache";
import { errorMessage, type ActionResult } from "@/components/actions";
import { draftFirstMessage, draftReply } from "@/lib/ai/draft";
import { assertRecipientAllowed, blockFields } from "@/lib/domain/blocklist";
import { checkDraft, swissSpelling } from "@/lib/domain/draft-rules";
import { nextStatus, statusAfterEdit } from "@/lib/domain/messages";
import { canTransition, stageAfterSend } from "@/lib/domain/pipeline";
import { MESSAGE_CHANNELS, type MessageChannel, type MessageStatus, type Stage } from "@/lib/domain/types";
import { suggestFollowUp } from "@/lib/domain/workdays";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function loadContact(supabase: Supa, contactId: string) {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, funktion, gesperrt, account_id, accounts(id, name, ort, branche, status)")
    .eq("id", contactId)
    .single();
  if (error) throw error;
  const account = data.accounts as unknown as { id: string; name: string; ort: string | null; branche: string | null; status: Stage };
  return { ...data, account };
}

async function loadMessage(supabase: Supa, id: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, contact_id, kanal, entwurf, final, status")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as { id: string; contact_id: string; kanal: MessageChannel; entwurf: string; final: string | null; status: MessageStatus };
}

function done(accountId: string) {
  revalidatePath(`/firmen/${accountId}`);
  revalidatePath("/");
  revalidatePath("/pipeline");
}

export async function draftMessage(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const kanal = String(fd.get("kanal")) as MessageChannel;
    if (!MESSAGE_CHANNELS.includes(kanal)) return { error: "Unbekannter Kanal." };
    const { supabase } = await requireUser();
    const contact = await loadContact(supabase, String(fd.get("contact_id")));
    assertRecipientAllowed(contact); // gesperrt → Abbruch vor jedem KI-Aufruf

    const { data: note } = await supabase
      .from("research_notes")
      .select("zusammenfassung, aufhaenger")
      .eq("account_id", contact.account.id)
      .order("erstellt_am", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!note) return { error: "Zuerst recherchieren: Jeder Entwurf braucht einen konkreten Punkt aus der Recherche." };

    const draft = await draftFirstMessage({
      kanal,
      firma: contact.account,
      kontakt: contact,
      recherche: note,
      angebot: env.offerText(),
      sender: env.sender(),
    });
    const { error } = await supabase.from("messages").insert({ contact_id: contact.id, kanal, entwurf: draft.text, final: draft.text });
    if (error) throw error;
    done(contact.account.id);
    return { ok: `Entwurf erstellt. Bezug: ${draft.bezug}` };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function saveMessageText(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const msg = await loadMessage(supabase, String(fd.get("message_id")));
    const status = statusAfterEdit(msg.status);
    const final = swissSpelling(String(fd.get("final") ?? ""));
    const { error } = await supabase.from("messages").update({ final, status }).eq("id", msg.id);
    if (error) throw error;
    const contact = await loadContact(supabase, msg.contact_id);
    done(contact.account.id);
    return { ok: "Gespeichert (Status: Entwurf)." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function setMessageStatus(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const to = String(fd.get("status")) as MessageStatus;
    const { supabase } = await requireUser();
    const msg = await loadMessage(supabase, String(fd.get("message_id")));
    const contact = await loadContact(supabase, msg.contact_id);
    assertRecipientAllowed(contact);

    // Text aus dem Formular übernehmen, falls beim Prüfen gleich mitgeschickt
    const formText = fd.get("final");
    const final = formText !== null && msg.status === "entwurf" ? swissSpelling(String(formText)) : msg.final;

    if (to === "geprueft") {
      const issues = checkDraft(final ?? "", env.sender(), msg.kanal);
      if (issues.length) return { error: `Noch nicht bereit: ${issues.join(" ")}` };
    }
    nextStatus({ status: msg.status, final }, to);

    const update: Record<string, unknown> = { status: to, final };
    if (to === "gesendet") update.gesendet_am = new Date().toISOString();
    const { error } = await supabase.from("messages").update(update).eq("id", msg.id);
    if (error) throw error;

    let hint = "";
    if (to === "gesendet") {
      const next = stageAfterSend(contact.account.status);
      if (next !== contact.account.status && canTransition(contact.account.status, next)) {
        await supabase.from("accounts").update({ status: next }).eq("id", contact.account.id);
        const due = suggestFollowUp();
        await supabase.from("follow_ups").insert({ account_id: contact.account.id, faellig_am: due, grund: `Nachfassen ${contact.name}` });
        hint = ` Firma auf «kontaktiert», Nachfassen am ${due.split("-").reverse().join(".")} (änderbar unter Nachfassen).`;
      }
      await supabase.from("activities").insert({
        account_id: contact.account.id,
        typ: "notiz",
        text: `${msg.kanal === "email" ? "E-Mail" : msg.kanal === "linkedin" ? "LinkedIn-Nachricht" : "Anruf"} an ${contact.name} gesendet.`,
      });
    }
    done(contact.account.id);
    return { ok: `Status: ${to}.${hint}` };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

/** Antwort eintragen. «Kein Interesse» sperrt den Kontakt sofort; sonst schlägt Claude eine Antwort vor. */
export async function recordReply(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const text = String(fd.get("antwort") ?? "").trim();
    const keinInteresse = fd.get("kein_interesse") === "on";
    if (!text && !keinInteresse) return { error: "Antworttext fehlt." };
    const { supabase } = await requireUser();
    const msg = await loadMessage(supabase, String(fd.get("message_id")));
    const contact = await loadContact(supabase, msg.contact_id);

    if (msg.status === "gesendet") {
      const { error } = await supabase.from("messages").update({ status: nextStatus(msg, "antwort_erhalten") }).eq("id", msg.id);
      if (error) throw error;
    } else if (msg.status !== "antwort_erhalten") {
      return { error: "Antworten können nur zu gesendeten Nachrichten erfasst werden." };
    }

    await supabase.from("activities").insert({
      account_id: contact.account.id,
      typ: "notiz",
      text: `Antwort von ${contact.name}${keinInteresse ? " (kein Interesse)" : ""}: ${text || "–"}`,
    });

    if (keinInteresse) {
      const { error } = await supabase
        .from("contacts")
        .update(blockFields(`Kein Interesse${text ? `: ${text.slice(0, 200)}` : ""}`))
        .eq("id", contact.id);
      if (error) throw error;
      done(contact.account.id);
      revalidatePath("/datenschutz");
      return { ok: `${contact.name} ist gesperrt und wird nicht mehr kontaktiert.` };
    }

    if (canTransition(contact.account.status, "antwort")) {
      await supabase.from("accounts").update({ status: "antwort" }).eq("id", contact.account.id);
    }

    assertRecipientAllowed(contact);
    const { data: note } = await supabase
      .from("research_notes")
      .select("zusammenfassung")
      .eq("account_id", contact.account.id)
      .order("erstellt_am", { ascending: false })
      .limit(1)
      .maybeSingle();
    const reply = await draftReply({
      kanal: msg.kanal,
      firma: contact.account,
      kontakt: contact,
      gesendet: msg.final ?? msg.entwurf,
      antwort: text,
      recherche: note?.zusammenfassung ?? null,
      sender: env.sender(),
    });
    const { error } = await supabase.from("messages").insert({ contact_id: contact.id, kanal: msg.kanal, entwurf: reply.text, final: reply.text });
    if (error) throw error;
    done(contact.account.id);
    return { ok: `Antwort erfasst, Vorschlag (${reply.art}) als Entwurf angelegt.` };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
