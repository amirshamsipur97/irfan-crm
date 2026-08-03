"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, signInWithGoogle, type AuthState } from "@/app/(auth)/actions";
import { GoogleGlyph } from "./AuthShell";

/**
 * GoTrue reports failed email links in the URL FRAGMENT (#error=…), which the
 * server never sees — an expired confirm link would otherwise land on a blank
 * login form with no explanation.
 */
function useHashAuthError(): string | null {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const code = params.get("error_code");
    const desc = params.get("error_description")?.replace(/\+/g, " ");
    if (!code && !desc) return;

    setMessage(
      code === "otp_expired"
        ? "That email link has expired or was already used. You don't need it: once an administrator approves your request you'll get a temporary password to sign in with here."
        : desc ?? "The email link could not be used."
    );
    // drop the fragment so a refresh doesn't repeat the message
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  return message;
}

const inputCls =
  "h-[40px] w-full rounded-[8px] border border-line-strong bg-white px-[12px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep";
const labelCls = "block pb-[6px] font-sans text-[12px] font-semibold leading-[16px] text-ink";

export function LoginCard({ oauthError }: { oauthError: string | null }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null);
  const hashError = useHashAuthError();
  const error = state?.error ?? oauthError ?? hashError;

  return (
    <div className="w-full max-w-[400px] rounded-[16px] bg-white px-[36px] py-[40px] shadow-[0px_10px_30px_rgba(0,0,0,0.08)]">
      <h1 className="text-center font-display text-[24px] font-semibold leading-[32px] text-ink">
        Welcome to Irfan CRM
      </h1>
      <p className="pt-[6px] text-center font-sans text-[13px] leading-[18px] text-ink-muted">
        Sign in to your agent workspace.
      </p>

      <form action={formAction} className="pt-[24px]">
        <label htmlFor="email" className={labelCls}>
          Enter email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@company.com"
          className={inputCls}
        />

        <label htmlFor="password" className={`${labelCls} pt-[14px]`}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputCls}
        />

        {error && (
          <p role="alert" className="pt-[12px] font-sans text-[13px] leading-[18px] text-[#e2445c]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-[20px] h-[40px] w-full rounded-[8px] bg-teal-deep font-sans text-[14px] font-medium leading-[20px] text-white transition-colors hover:bg-[#006e87] disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Continue"}
        </button>
      </form>

      {/* Google stays on SIGN-IN only, for the existing Google-provider admin
          accounts — they have no password at all, so removing it locked them
          out. Sign-UP has no Google button: new members always come through the
          form and an admin-issued temporary password. */}
      <div className="flex items-center gap-[12px] py-[18px]">
        <span className="h-px flex-1 bg-line" />
        <span className="font-sans text-[13px] leading-[18px] text-ink-muted">Or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="flex h-[40px] w-full items-center justify-center gap-[10px] rounded-[8px] border border-line-strong bg-white font-sans text-[14px] leading-[20px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
        >
          <GoogleGlyph />
          Continue with Google
        </button>
      </form>

      <p className="pt-[28px] text-center font-sans text-[13px] leading-[18px] text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-link hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
