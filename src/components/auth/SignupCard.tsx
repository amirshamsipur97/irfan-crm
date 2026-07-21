"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, signInWithGoogle, type AuthState } from "@/app/(auth)/actions";
import { GoogleGlyph } from "./AuthShell";

const DIAL_CODES = ["+968", "+971", "+98", "+966", "+974", "+965", "+973", "+1", "+44", "+7", "+91"];

const inputCls =
  "h-[38px] w-full rounded-[8px] border border-line-strong bg-white px-[12px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep";

function FieldLabel({
  htmlFor,
  required = false,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block pb-[6px] font-sans text-[12px] font-medium leading-[16px] text-ink"
    >
      {children}
      {required && <span className="pl-[2px] text-[#e2445c]">*</span>}
    </label>
  );
}

export function SignupCard() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, null);

  if (state?.notice) {
    return (
      <div className="w-full max-w-[540px] rounded-[16px] bg-white px-[40px] py-[48px] text-center shadow-[0px_10px_30px_rgba(0,0,0,0.08)]">
        <span className="mx-auto flex size-[48px] items-center justify-center rounded-full bg-[#e6f7ef]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4.5 12.5l5 5L19.5 7" stroke="#00c875" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="pt-[16px] font-display text-[22px] font-semibold leading-[30px] text-ink">
          Confirm your email
        </h1>
        <p className="pt-[8px] font-sans text-[14px] leading-[21px] text-ink-muted">{state.notice}</p>
        <Link
          href="/login"
          className="mt-[24px] inline-block rounded-[8px] border border-line-strong px-[20px] py-[9px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[540px] rounded-[16px] bg-white px-[40px] py-[36px] shadow-[0px_10px_30px_rgba(0,0,0,0.08)]">
      <h1 className="font-display text-[19px] font-semibold leading-[28px] text-ink">
        Create your agent account
      </h1>
      <p className="pt-[2px] font-sans text-[13px] leading-[18px] text-ink-muted">
        Join the Irfan Invest CRM with your company email or an invite.
      </p>

      <form action={formAction} className="grid grid-cols-2 gap-x-[18px] gap-y-[16px] pt-[24px]">
        <div>
          <FieldLabel htmlFor="first_name" required>
            First name
          </FieldLabel>
          <input id="first_name" name="first_name" required autoComplete="given-name" className={inputCls} />
        </div>
        <div>
          <FieldLabel htmlFor="last_name" required>
            Last name
          </FieldLabel>
          <input id="last_name" name="last_name" required autoComplete="family-name" className={inputCls} />
        </div>

        <div>
          <FieldLabel htmlFor="su_email" required>
            Work email
          </FieldLabel>
          <input
            id="su_email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            className={inputCls}
          />
        </div>
        <div>
          <FieldLabel htmlFor="field_role" required>
            Field / Position
          </FieldLabel>
          <select id="field_role" name="field_role" required defaultValue="agent" className={inputCls}>
            <option value="agent">Sales Agent</option>
            <option value="media">Media Team</option>
            <option value="manager">Sales Manager</option>
            <option value="finance">Finance</option>
          </select>
        </div>

        <div className="col-span-2">
          <FieldLabel htmlFor="su_phone" required>
            Phone number
          </FieldLabel>
          <div className="flex gap-[8px]">
            <select
              aria-label="Country code"
              name="country_code"
              defaultValue="+968"
              className="h-[38px] w-[92px] cursor-pointer rounded-[8px] border border-line-strong bg-white px-[8px] font-sans text-[14px] text-ink outline-none focus:border-teal-deep"
            >
              {DIAL_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              id="su_phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel-national"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="su_password" required>
            Password
          </FieldLabel>
          <input
            id="su_password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </div>
        <div>
          <FieldLabel htmlFor="su_confirm" required>
            Confirm password
          </FieldLabel>
          <input
            id="su_confirm"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </div>

        {state?.error && (
          <p role="alert" className="col-span-2 font-sans text-[13px] leading-[18px] text-[#e2445c]">
            {state.error}
          </p>
        )}

        <p className="col-span-2 pt-[4px] text-center font-sans text-[11px] leading-[16px] text-ink-muted">
          By clicking submit, I acknowledge receipt of the Irfan Invest{" "}
          <a href="https://irfaninvest.com" target="_blank" rel="noreferrer" className="text-link hover:underline">
            Privacy policy
          </a>
        </p>

        <div className="col-span-2 flex justify-center pt-[4px]">
          <button
            type="submit"
            disabled={pending}
            className="h-[40px] rounded-[20px] bg-teal-deep px-[36px] font-sans text-[14px] font-medium leading-[20px] text-white transition-colors hover:bg-[#006e87] disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-[12px] py-[16px]">
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

      <p className="pt-[20px] text-center font-sans text-[13px] leading-[18px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-link hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
