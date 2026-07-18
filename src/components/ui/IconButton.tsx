"use client";

import { Icon } from "./Icon";
import type { IconName } from "@/lib/figma-icons";

/**
 * Square icon button (design "Component 5").
 * Sizes used in the design: 24 (widget controls), 32 (toolbars), 40 (top bar).
 */
export function IconButton({
  icon,
  size = 32,
  iconSize,
  label,
  outlined = false,
  className = "",
  onClick,
}: {
  icon: IconName;
  size?: 24 | 32 | 40;
  iconSize?: number;
  label?: string;
  outlined?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const resolvedIcon = iconSize ?? (size === 24 ? 16 : 20);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex items-center justify-center rounded-[4px] transition-colors duration-150 hover:bg-[var(--hover-ghost)] active:bg-[rgba(103,104,121,0.2)] ${
        outlined ? "border border-line-strong" : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={resolvedIcon} />
    </button>
  );
}
