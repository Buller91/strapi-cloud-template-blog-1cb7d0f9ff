"use server";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/actions";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function requestMagicLink(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const neutral = { ok: "Falls die Adresse berechtigt ist, ist ein Anmeldelink unterwegs." };
  // Nur die eine erlaubte Adresse bekommt einen Link; keine Selbstregistrierung.
  if (email !== env.allowedEmail()) return neutral;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${env.appUrl()}/auth/callback` },
  });
  if (error) console.error("Magic Link fehlgeschlagen:", error.status);
  return neutral;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
