/**
 * Instant skeleton while a board's server data loads.
 * Self-contained on purpose — no client-component imports.
 * NOTE for E2E sessions: this Suspense boundary never hydrates inside the
 * hidden Browser pane, so boards are click-dead there. Temporarily rename the
 * loading.tsx files when driving boards from the pane; real browsers are fine.
 */
export default function BoardLoading() {
  return (
    <main className="relative min-w-0 flex-1 overflow-hidden rounded-tl-[12px] border-l border-t border-line-soft bg-white shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      <div className="flex h-full flex-col">
        <div className="px-[40px] pt-[20px]">
          <div className="h-[28px] w-[180px] animate-pulse rounded-[4px] bg-[#eceef2]" />
          <div className="mt-[14px] flex gap-[8px]">
            <div className="h-[32px] w-[110px] animate-pulse rounded-[4px] bg-[#eceef2]" />
            <div className="h-[32px] w-[88px] animate-pulse rounded-[4px] bg-[#f5f6f8]" />
            <div className="h-[32px] w-[88px] animate-pulse rounded-[4px] bg-[#f5f6f8]" />
            <div className="h-[32px] w-[88px] animate-pulse rounded-[4px] bg-[#f5f6f8]" />
          </div>
        </div>
        <div className="px-[40px] pt-[28px]">
          <div className="h-[22px] w-[140px] animate-pulse rounded-[4px] bg-[#eceef2]" />
          <div className="mt-[12px] overflow-hidden rounded-[6px] border border-line">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex h-[40px] items-center gap-[12px] border-b border-line px-[12px] last:border-0"
              >
                <div className="h-[14px] w-[180px] animate-pulse rounded-[3px] bg-[#f0f1f5]" />
                <div className="h-[14px] w-[110px] animate-pulse rounded-[3px] bg-[#f5f6f8]" />
                <div className="h-[14px] w-[90px] animate-pulse rounded-[3px] bg-[#f5f6f8]" />
                <div className="h-[14px] w-[120px] animate-pulse rounded-[3px] bg-[#f5f6f8]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
