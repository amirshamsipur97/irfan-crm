import { ICONS, type IconName } from "@/lib/figma-icons";

/** Renders a Figma-exported asset at an exact pixel size. */
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICONS[name]}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`block shrink-0 select-none ${className}`}
      draggable={false}
    />
  );
}
