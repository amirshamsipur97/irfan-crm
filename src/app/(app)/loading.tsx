import { Surface } from "@/components/shell/AppChrome";

/** Skeleton for the Home page while its widgets load. */
export default function HomeLoading() {
  return (
    <Surface>
      <div className="px-[48px] pt-[32px]">
        <div className="h-[28px] w-[280px] animate-pulse rounded-[4px] bg-[#eceef2]" />
        <div className="mt-[24px] grid grid-cols-3 gap-[16px]">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[140px] animate-pulse rounded-[8px] bg-[#f5f6f8]" />
          ))}
        </div>
      </div>
    </Surface>
  );
}
