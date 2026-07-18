"use client";

import { Icon } from "./Icon";
import type { IconName } from "@/lib/figma-icons";

/**
 * Text button, matching the design's "Component 7 / 8 / 10":
 * - ghost: borderless, hover tint (Feedback / Agents / Search / Filters)
 * - outline: 1px #c3c6d4 border (Members / Customize / All / Deals / Google / Outlook)
 */
export function Button({
  children,
  icon,
  iconImage,
  variant = "ghost",
  size = 32,
  iconSize = 20,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  icon?: IconName;
  /** raster logo (Google / Outlook) rendered at 16px */
  iconImage?: string;
  variant?: "ghost" | "outline";
  size?: 24 | 32;
  iconSize?: number;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-[4px] font-sans text-[14px] text-ink transition-colors duration-150 hover:bg-[var(--hover-ghost)] active:bg-[rgba(103,104,121,0.2)] ${
        variant === "outline" ? "border border-line-strong px-[9px] py-[5px]" : "px-[8px] py-[4px]"
      } ${icon || iconImage ? (size === 24 ? "gap-[8px]" : "gap-[8px]") : ""} ${className}`}
      style={{ height: size }}
    >
      {icon && <Icon name={icon} size={size === 24 ? 16 : iconSize} />}
      {iconImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconImage} alt="" width={16} height={16} className="block shrink-0" />
      )}
      <span className="whitespace-nowrap leading-[22px]">{children}</span>
    </button>
  );
}
