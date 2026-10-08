"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { errorMessage, type ActionResult } from "@/components/actions";
import { formatResearch, researchCompany } from "@/lib/ai/research";
import { blockFields } from "@/lib/domain/blocklist";
import { parseCsv, planImport, type ImportPlan } from "@/lib/domain/csv-import";
import { dedupeKey, isFreemail, normalizeDomain, normalizeLinkedin, normalizeWebsite } from "@/lib/domain/normalize";
import { assertTransition, isStage, needsFollowUp } from "@/lib/domain/pipeline";
import { ACTIVITY_TYPES, CHANNELS, KANTONE, type Stage } from "@/lib/domain/types";
import { suggestFollowUp } from "@/lib/domain/workdays";
import { requireUser } from "@/lib/supabase/server";
import { fetchPublicSite } from "@/lib/web/fetch-site";

const opt = z.string().trim().transform((v) => (v ? v : null));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT");

const AccountSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt."),
  ort: opt,
  kanton: z.union([z.enum(KANTONE), z.literal("")]).transform((v) => v || null),
  branche: opt,
  groesse_ca: opt,
  website: opt,
  quelle: z.string().trim().min(1, "Quelle ist Pflicht."),
  quelle_datum: date,
  herkunftskanal: z.enum(CHANNELS),
});

function fields(fd: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));
}

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt."),
  funktion: opt,
  email_geschaeftlich: opt.refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "E-Mail ungültig."),
  linkedin_url: opt,
  quelle: z.string().trim().min(1, "Quelle ist Pflicht."),
  quelle_datum: date,
});

function parseContact(fd: FormData, prefix = "") {
  const raw = fields(fd, ["name", "funktion", "email_geschaeftlich", "linkedin_url", "quelle", "quelle_datum"].map((k) => prefix + k));
  const data = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.slice(prefix.length), v]));
  const c = ContactSchema.parse(data);
  if (c.email_geschaeftlich && isFreemail(c.email_geschaeftlich) && fd.get(`${prefix}geschaeftlich_bestaetigt`) !== "on") {
    throw new Error("Freemail-Adresse: bitte bestätigen, dass es sich um eine geschäftliche Adresse handelt.");
  }
  let linkedin: string | null = null;
  if (c.linkedin_url) {
    linkedin = normalizeLinkedin(c.linkedin_url);
    if (!linkedin) throw new Error("LinkedIn-URL nicht erkannt (linkedin.com/in/… oder /company/…).");
  }
  return { ...c, email_geschaeftlich: c.email_geschaeftlich?.toLowerCase() ?? null, linkedin_url: linkedin };
}

function zodMessage(e: unknown) {
  return e instanceof z.ZodError ? e.issues.map((i) => i.message).join(" ") : errorMessage(e);
}

export async function createAccount(_: ActionResult, fd: FormData): Promise<ActionResult> {
  let id: string;
  try {
    const a = AccountSchema.parse(fields(fd, Object.keys(AccountSchema.shape)));
    const website = normalizeWebsite(a.website);
    if (a.website && !website) return { error: "Website nicht erkannt." };
    const { supabase } = await requireUser();
    const key = dedupeKey({ website, name: a.name, ort: a.ort });
    const { data: dup } = await supabase.from("accounts").select("id, name").eq("dedupe_key", key).maybeSingle();
    if (dup) return { error: `Duplikat: «${dup.name}» existiert bereits (${key}).` };

    const { data, error } = await supabase
      .from("accounts")
      .insert({ ...a, website, domain: normalizeDomain(website), dedupe_key: key })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;

    if (String(fd.get("k_name") ?? "").trim()) {
      const c = parseContact(fd, "k_");
      const { error: ce } = await supabase.from("contacts").insert({ ...c, account_id: id });
      if (ce) throw ce;
    }
  } catch (e) {
    return { error: zodMessage(e) };
  }
  revalidatePath("/firmen");
  redirect(`/firmen/${id}`);
}

export async function previewImport(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const plan = await buildPlan(fd);
    const defaults = fields(fd, ["quelle", "quelle_datum", "herkunftskanal"]);
    return { data: { plan, csv: await csvText(fd), defaults } };
  } catch (e) {
    return { error: zodMessage(e) };
  }
}

async function csvText(fd: FormData): Promise<string> {
  const file = fd.get("datei");
  if (file instanceof File && file.size > 0) return await file.text();
  return String(fd.get("csv") ?? "");
}

async function buildPlan(fd: FormData): Promise<ImportPlan> {
  const defaults = z
    .object({ quelle: z.string().trim(), quelle_datum: date, herkunftskanal: z.enum(CHANNELS) })
    .parse(fields(fd, ["quelle", "quelle_datum", "herkunftskanal"]));
  const text = await csvText(fd);
  if (!text.trim()) throw new Error("Keine CSV-Daten.");
  const rows = parseCsv(text);
  if (rows.length > 2000) throw new Error("Maximal 2000 Zeilen pro Import.");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("accounts").select("dedupe_key");
  if (error) throw error;
  return planImport(rows, new Set(data.map((r) => r.dedupe_key as string)), defaults);
}

export async function commitImport(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const plan = await buildPlan(fd); // erneut planen: DB-Stand kann sich geändert haben
    const { supabase } = await requireUser();
    let firmen = 0;
    let kontakte = 0;
    for (const r of plan.neu) {
      const { kontakt, zeile: _z, ...account } = r;
      const { data, error } = await supabase.from("accounts").insert(account).select("id").single();
      if (error) {
        if (error.code === "23505") continue; // parallel angelegt
        throw error;
      }
      firmen++;
      if (kontakt) {
        const { error: ce } = await supabase
          .from("contacts")
          .insert({ ...kontakt, account_id: data.id, quelle: r.quelle, quelle_datum: r.quelle_datum });
        if (ce) throw ce;
        kontakte++;
      }
    }
    revalidatePath("/firmen");
    return { ok: `${firmen} Firmen und ${kontakte} Kontakte importiert, ${plan.duplikate.length} Duplikate übersprungen.` };
  } catch (e) {
    return { error: zodMessage(e) };
  }
}

export async function changeStage(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const id = String(fd.get("account_id"));
    const to = String(fd.get("status"));
    if (!isStage(to)) return { error: "Unbekannte Stufe." };
    const { supabase } = await requireUser();
    const { data: acc, error } = await supabase.from("accounts").select("status").eq("id", id).single();
    if (error) throw error;
    const from = acc.status as Stage;
    if (from === to) return null;
    assertTransition(from, to);
    const { error: ue } = await supabase.from("accounts").update({ status: to }).eq("id", id);
    if (ue) throw ue;

    let hint = "";
    if (needsFollowUp(to)) {
      const due = String(fd.get("faellig_am") || "") || suggestFollowUp();
      await supabase.from("follow_ups").insert({ account_id: id, faellig_am: due, grund: "Nachfassen nach Erstkontakt" });
      hint = ` Nachfassen am ${due.split("-").reverse().join(".")} eingeplant.`;
    }
    revalidatePath("/pipeline");
    revalidatePath(`/firmen/${id}`);
    revalidatePath("/");
    return { ok: `Verschoben.${hint}` };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function addContact(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const accountId = String(fd.get("account_id"));
    const c = parseContact(fd);
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("contacts").insert({ ...c, account_id: accountId }).select("gesperrt").single();
    if (error) throw error;
    revalidatePath(`/firmen/${accountId}`);
    return data.gesperrt
      ? { error: "Kontakt angelegt, aber sofort gesperrt: Er steht auf der Sperrliste." }
      : { ok: "Kontakt angelegt." };
  } catch (e) {
    return { error: zodMessage(e) };
  }
}

export async function blockContact(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const id = String(fd.get("contact_id"));
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("contacts")
      .update(blockFields(String(fd.get("grund") ?? "")))
      .eq("id", id)
      .select("account_id")
      .single();
    if (error) throw error;
    revalidatePath(`/firmen/${data.account_id}`);
    revalidatePath("/datenschutz");
    return { ok: "Kontakt gesperrt." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function addActivity(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const a = z
      .object({
        account_id: z.string().uuid(),
        typ: z.enum(ACTIVITY_TYPES),
        text: z.string().trim().min(1, "Text fehlt."),
        datum: z.string().optional(),
      })
      .parse(fields(fd, ["account_id", "typ", "text", "datum"]));
    const { supabase } = await requireUser();
    const datum = a.datum ? new Date(a.datum).toISOString() : new Date().toISOString();
    const { error } = await supabase.from("activities").insert({ ...a, datum });
    if (error) throw error;
    revalidatePath(`/firmen/${a.account_id}`);
    revalidatePath("/");
    return { ok: "Gespeichert." };
  } catch (e) {
    return { error: zodMessage(e) };
  }
}

export async function addFollowUp(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const f = z
      .object({ account_id: z.string().uuid(), faellig_am: date, grund: z.string().trim() })
      .parse(fields(fd, ["account_id", "faellig_am", "grund"]));
    const { supabase } = await requireUser();
    const { error } = await supabase.from("follow_ups").insert(f);
    if (error) throw error;
    revalidatePath(`/firmen/${f.account_id}`);
    revalidatePath("/nachfassen");
    return { ok: "Nachfassen eingeplant." };
  } catch (e) {
    return { error: zodMessage(e) };
  }
}

export async function runResearch(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const id = String(fd.get("account_id"));
    const { supabase } = await requireUser();
    const { data: acc, error } = await supabase.from("accounts").select("name, ort, branche, website, status").eq("id", id).single();
    if (error) throw error;
    if (!acc.website) return { error: "Keine Website hinterlegt." };

    const site = await fetchPublicSite(acc.website);
    const r = await researchCompany(acc, site);
    const zusammenfassung = formatResearch(r) + (site.hinweise.length ? `\n\nHinweise zum Abruf:\n- ${site.hinweise.join("\n- ")}` : "");
    const { error: ie } = await supabase
      .from("research_notes")
      .insert({ account_id: id, zusammenfassung, aufhaenger: r.aufhaenger, quellen_urls: r.quellen });
    if (ie) throw ie;
    if (acc.status === "neu") await supabase.from("accounts").update({ status: "recherchiert" }).eq("id", id);
    revalidatePath(`/firmen/${id}`);
    return { ok: "Recherche gespeichert." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
