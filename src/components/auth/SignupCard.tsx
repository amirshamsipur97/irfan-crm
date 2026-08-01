"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/app/(auth)/actions";
import { COUNTRIES, DEFAULT_DIAL } from "@/components/crm/phone-input";


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
          Request sent
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
          {/* same country picker the boards use, so a number entered at signup
              is stored exactly like every other number in the CRM */}
          <div className="flex gap-[8px]">
            <select
              aria-label="Country code"
              name="country_code"
              defaultValue={DEFAULT_DIAL}
              className="h-[38px] w-[150px] cursor-pointer rounded-[8px] border border-line-strong bg-white px-[8px] font-sans text-[14px] text-ink outline-none focus:border-teal-deep"
            >
              {COUNTRIES.map((c) => (
                <option key={`${c.code}-${c.name}`} value={c.code}>
                  {c.flag} {c.name} {c.code}
                </option>
              ))}
            </select>
            <input
              id="su_phone"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel-national"
              placeholder="9123 4567"
              className={inputCls}
            />
          </div>
        </div>

        <p className="col-span-2 rounded-[8px] bg-[#f0f6ff] px-[14px] py-[11px] font-sans text-[12px] leading-[18px] text-ink-muted">
          You do not pick a password here. Once your request is approved we email
          you a temporary one, and the app asks you to choose your own the first
          time you sign in.
        </p>

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

      {/* Google sign-up is temporarily disabled — see LoginCard for the note. */}

      <p className="pt-[20px] text-center font-sans text-[13px] leading-[18px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-link hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
