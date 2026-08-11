import { TEMPERATURE_OPTIONS } from "@/lib/person-fields";

/**
 * Read-only temperature chip for the drawers — the boards edit the value
 * through the shared OptionCell, so this only has to render it. Colours come
 * from TEMPERATURE_OPTIONS, never from a copy.
 */
export function TemperaturePill({ value }: { value: string | null | undefined }) {
  const option = TEMPERATURE_OPTIONS.find((t) => t.key === value);
  if (!option) return <>—</>;
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-[11px] px-[10px] font-sans text-[12px] font-medium leading-[18px] text-white"
      style={{ backgroundColor: option.color }}
    >
      {option.label}
    </span>
  );
}
