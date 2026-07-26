"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { canAnimate } from "@/lib/motion";
import { setNewPassword } from "@/app/(app)/password-actions";

const inputCls =
  "h-[40px] w-full rounded-[8px] border border-line-strong bg-white px-[12px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep";
const labelCls =
  "block pb-[6px] font-sans text-[12px] font-semibold leading-[16px] text-ink";

/**
 * Blocking first-login dialog: the account was created with a temporary
 * password that was emailed to the user, so they cannot reach the workspace
 * until they have chosen their own. There is deliberately no close button and
 * no dismiss-on-backdrop — the only way out is setting a password.
 */
export function FirstLoginPassword({ fullName }: { fullName: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const cardRef = useRef<HTMLFormElement>(null);

  useGSAP(() => {
    if (!canAnimate() || !cardRef.current) return;
    gsap.from(cardRef.current, {
      y: 12,
      opacity: 0,
      duration: 0.28,
      ease: "power2.out",
      clearProps: "all",
    });
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await setNewPassword(password, confirm);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    // the server action revalidates the layout, which unmounts this dialog
  };

  const firstName = fullName.trim().split(/\s+/)[0] || "there";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(23,26,42,0.55)] px-[20px]">
      <form
        ref={cardRef}
        onSubmit={submit}
        className="w-full max-w-[420px] rounded-[16px] bg-white px-[36px] py-[34px] shadow-[0px_18px_50px_rgba(0,0,0,0.28)]"
      >
        <h2 className="font-display text-[22px] font-semibold leading-[30px] text-ink">
          Welcome, {firstName}
        </h2>
        <p className="pt-[6px] font-sans text-[13px] leading-[19px] text-ink-muted">
          You signed in with the temporary password we emailed you. Choose your
          own password to finish setting up your account.
        </p>

        <div className="pt-[22px]">
          <label htmlFor="new_password" className={labelCls}>
            New password
          </label>
          <input
            id="new_password"
            type="password"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={inputCls}
          />
        </div>

        <div className="pt-[14px]">
          <label htmlFor="confirm_password" className={labelCls}>
            Confirm password
          </label>
          <input
            id="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat it"
            className={inputCls}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="pt-[12px] font-sans text-[13px] leading-[18px] text-[#e2445c]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !password || !confirm}
          className="mt-[22px] h-[40px] w-full rounded-[8px] bg-teal-deep font-sans text-[14px] font-medium leading-[20px] text-white transition-colors hover:bg-[#006e87] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Confirm and continue"}
        </button>

        <p className="pt-[14px] text-center font-sans text-[12px] leading-[17px] text-ink-muted">
          The temporary password stops working once you confirm.
        </p>
      </form>
    </div>
  );
}
