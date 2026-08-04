import { Icon } from "@/components/ui/Icon";

/** Split auth layout from the Figma sign-in/sign-up frames: brand left, card right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-wrap items-center justify-center gap-x-[96px] gap-y-[40px] bg-[#f0f0ee] px-[40px] pb-[130px] pt-[48px]">
      <div className="hidden select-none flex-col lg:flex">
        <p className="pb-[10px] font-sans text-[13px] font-semibold uppercase tracking-[3.5px] text-[#a5a5af]">
          The AI operating system for real estate sales
        </p>
        <p className="bg-gradient-to-b from-[#3d414d] via-[#7c818e] to-[#c9ccd3] bg-clip-text font-display text-[84px] font-semibold leading-[92px] tracking-[-2px] text-transparent">
          IrfanInvest
        </p>
        <p className="pl-[4px] font-display text-[34px] font-medium leading-[44px] tracking-[2px] text-[#a5a5af]">
          CRM
        </p>
      </div>
      {children}

      {/* product lockup — the TopBar's mark + wordmark, scaled 25→34px with
          its spacing kept in proportion (gap 8px → 10px, same optical
          baseline). Sits where the old "Power by NexProp" block did. */}
      <div className="absolute bottom-[36px] left-1/2 flex -translate-x-1/2 select-none items-center gap-[10px]">
        <Icon name="logo" size={34} />
        <span className="font-display text-[22px] font-light leading-[32px] text-ink">
          CRM
        </span>
      </div>
    </main>
  );
}

export function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92a8.78 8.78 0 002.68-6.62z"
        fill="#4285F4"
      />
      <path
        d="M9 18a8.6 8.6 0 005.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86a5.4 5.4 0 01-5.06-3.72H.93v2.34A9 9 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.94 10.7a5.41 5.41 0 010-3.4V4.96H.93a9 9 0 000 8.08l3-2.34z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 00.93 4.96l3 2.34A5.4 5.4 0 019 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
