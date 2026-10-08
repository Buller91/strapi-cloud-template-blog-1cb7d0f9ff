import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  // Kanonische Adresse statt request-Origin (hinter Proxies sonst falscher Host, Cookies gehen verloren)
  return NextResponse.redirect(new URL(ok ? "/mfa/pruefen" : "/login", env.appUrl()));
}
