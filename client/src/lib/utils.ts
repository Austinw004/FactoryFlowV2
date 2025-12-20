import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats economic regime names from SCREAMING_SNAKE_CASE to Title Case
 * e.g., "IMBALANCED_EXCESS" -> "Imbalanced Excess"
 */
export function formatRegimeName(regime: string): string {
  if (!regime) return "";
  return regime
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
