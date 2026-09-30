import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const code = url.searchParams.get("code");
  const supabase = await supabaseServer();

  const { error } = token_hash
    ? await supabase.auth.verifyOtp({ type, token_hash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("no token") };

  return NextResponse.redirect(new URL(error ? "/login?error=link" : "/", url.origin));
}
