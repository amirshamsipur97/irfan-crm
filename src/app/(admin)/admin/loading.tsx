/** Dark skeleton for the administration takeover — matches AdminView's frame. */
export default function AdminLoading() {
  return (
    <div className="flex h-full flex-col bg-[#171c3f]">
      <header className="flex h-[52px] shrink-0 items-center gap-[16px] border-b border-white/10 bg-[#12163a] px-[16px]">
        <div className="h-[36px] w-[84px] animate-pulse rounded-[4px] bg-white/10" />
        <div className="h-[20px] w-[200px] animate-pulse rounded-[4px] bg-white/10" />
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-[240px] shrink-0 border-r border-white/10 py-[16px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="mx-[12px] mb-[6px] h-[36px] animate-pulse rounded-[4px] bg-white/[0.06]"
            />
          ))}
        </nav>
        <main className="flex-1 p-[32px]">
          <div className="h-[30px] w-[220px] animate-pulse rounded-[4px] bg-white/10" />
          <div className="mt-[8px] h-[16px] w-[320px] animate-pulse rounded-[4px] bg-white/[0.06]" />
          <div className="mt-[20px] h-[180px] max-w-[720px] animate-pulse rounded-[8px] bg-white/[0.04]" />
          <div className="mt-[20px] h-[140px] max-w-[720px] animate-pulse rounded-[8px] bg-white/[0.04]" />
        </main>
      </div>
    </div>
  );
}
