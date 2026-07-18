"use client";

/**
 * User avatar — photo when available, otherwise Monday-style orange initials.
 */
export function Avatar({
  name,
  src,
  size = 32,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={`flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span
          className="flex size-full items-center justify-center bg-[#fdab3d] font-sans font-semibold text-white"
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {initials || "?"}
        </span>
      )}
    </span>
  );
}
