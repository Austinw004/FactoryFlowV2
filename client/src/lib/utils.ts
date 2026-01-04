import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Friendly regime name mappings for customer-facing UI
 */
const FRIENDLY_REGIME_NAMES: Record<string, { friendly: string; description: string }> = {
  "BALANCED": { 
    friendly: "Stable Market", 
    description: "Economic conditions are balanced with normal supply-demand dynamics" 
  },
  "IMBALANCED_EXCESS": { 
    friendly: "Market Overheating", 
    description: "Demand exceeds supply capacity, prices trending upward" 
  },
  "IMBALANCED_SHORTAGE": { 
    friendly: "Supply Constrained", 
    description: "Supply shortages creating procurement challenges" 
  },
  "CRISIS": { 
    friendly: "Market Disruption", 
    description: "Significant economic disruption requiring defensive measures" 
  },
  "RECOVERY": { 
    friendly: "Market Recovery", 
    description: "Economic conditions improving, consider strategic investments" 
  },
  "EXPANSION": { 
    friendly: "Growth Phase", 
    description: "Economy expanding, favorable conditions for growth initiatives" 
  },
  "CONTRACTION": { 
    friendly: "Slowdown", 
    description: "Economic activity declining, focus on efficiency" 
  },
};

/**
 * Get friendly regime name with optional description
 */
export function getFriendlyRegimeName(regime: string): { friendly: string; technical: string; description: string } {
  if (!regime) return { friendly: "Unknown", technical: "", description: "" };
  
  const mapping = FRIENDLY_REGIME_NAMES[regime.toUpperCase()];
  const technical = formatRegimeName(regime);
  
  if (mapping) {
    return { friendly: mapping.friendly, technical, description: mapping.description };
  }
  
  return { friendly: technical, technical, description: "" };
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

/**
 * Format large currency values with appropriate precision
 * - Values >= $1M: show as "$1.2M"
 * - Values >= $1K: show as "$1.2K" or "$12.5K"
 * - Smaller values: show as "$123"
 */
export function formatCurrencyCompact(value: number): string {
  if (value === 0) return "$0";
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${Math.round(absValue)}`;
}

/**
 * Format percentages with appropriate precision
 * - Integer percentages for values near whole numbers
 * - One decimal place otherwise
 */
export function formatPercentage(value: number, includeSign = false): string {
  const formatted = Math.abs(value - Math.round(value)) < 0.05 
    ? Math.round(value).toString()
    : value.toFixed(1);
  
  if (includeSign && value > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}

/**
 * Get relative time string (e.g., "2 hours ago", "Just now")
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return then.toLocaleDateString();
}

/**
 * Get risk level color and label based on score (0-100)
 */
export function getRiskLevel(score: number): { color: string; bgColor: string; label: string } {
  if (score < 30) {
    return { color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Low Risk" };
  }
  if (score < 70) {
    return { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", label: "Moderate Risk" };
  }
  return { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", label: "High Risk" };
}

/**
 * Get health score color and label based on score (0-100)
 */
export function getHealthLevel(score: number): { color: string; bgColor: string; label: string } {
  if (score >= 80) {
    return { color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Excellent" };
  }
  if (score >= 60) {
    return { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", label: "Good" };
  }
  if (score >= 40) {
    return { color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/30", label: "Fair" };
  }
  return { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", label: "Needs Attention" };
}
