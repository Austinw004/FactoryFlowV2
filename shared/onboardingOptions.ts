/**
 * Canonical dropdown options for the company profile.
 *
 * Both the onboarding wizard (`client/src/pages/Onboarding.tsx`) and the
 * Settings → Configuration page (`client/src/pages/Configuration.tsx`)
 * import these lists. Until this file existed, the wizard used Title Case
 * strings ("Industrial Equipment", "Aerospace & Defense") and Configuration
 * used kebab-case slugs ("industrial", "aerospace") — so any value saved by
 * the wizard rendered as a blank dropdown on Settings (no SelectItem
 * matched). Round-13 audit (F2-FILED-023) caught this.
 *
 * INDUSTRIES is sourced from `shared/industryConfig.ts` so the AI-context-
 * hints map keys stay in lockstep with what the form actually accepts.
 *
 * COMPANY_SIZES uses bucket slugs as the persisted value (e.g., "51-200")
 * with a human-readable label for display. Don't change a `value` after
 * launch — existing rows store the slug and the new value won't render.
 */
import { INDUSTRY_CONFIGS } from "./industryConfig";

// Title Case industry names. Lifted directly from the keys of
// INDUSTRY_CONFIGS so any new industry added to industryConfig.ts shows up
// in the dropdown automatically. Order is the iteration order of the
// underlying object — if presentation order matters, sort explicitly.
export const INDUSTRY_OPTIONS: string[] = Object.keys(INDUSTRY_CONFIGS);

export const COMPANY_SIZE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "1-10",      label: "1–10 employees"        },
  { value: "11-50",     label: "11–50 employees"       },
  { value: "51-200",    label: "51–200 employees"      },
  { value: "201-1000",  label: "201–1,000 employees"   },
  { value: "1001-5000", label: "1,001–5,000 employees" },
  { value: "5001+",     label: "5,000+ employees"      },
] as const;

export const ANNUAL_REVENUE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "pre-revenue", label: "Pre-revenue"       },
  { value: "under-1m",    label: "Under $1M"         },
  { value: "1m-10m",      label: "$1M – $10M"        },
  { value: "10m-50m",     label: "$10M – $50M"       },
  { value: "50m-250m",    label: "$50M – $250M"      },
  { value: "250m-1b",     label: "$250M – $1B"       },
  { value: "over-1b",     label: "Over $1B"          },
] as const;
