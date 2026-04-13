import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";

/**
 * Global keyboard shortcuts for enterprise navigation
 *
 * Cmd+K / Ctrl+K — Command palette (handled by CommandPalette)
 * G then D — Go to Dashboard
 * G then S — Go to Supply Chain
 * G then P — Go to Procurement
 * G then O — Go to Operations
 * G then A — Go to Automations
 * G then T — Go to Audit Trail
 * ? — Show keyboard shortcuts help
 * Escape — Close any open dialog
 */

interface ShortcutConfig {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
  scope?: "global" | "page";
}

let pendingGo = false;
let goTimeout: ReturnType<typeof setTimeout>;

export const SHORTCUTS = [
  { keys: "⌘K", description: "Open command palette" },
  { keys: "/", description: "Focus search" },
  { keys: "G → D", description: "Go to Dashboard" },
  { keys: "G → S", description: "Go to Supply Chain" },
  { keys: "G → P", description: "Go to Procurement" },
  { keys: "G → O", description: "Go to Operations" },
  { keys: "G → F", description: "Go to Demand & Forecasting" },
  { keys: "G → A", description: "Go to Automations" },
  { keys: "G → T", description: "Go to Audit Trail" },
  { keys: "G → I", description: "Go to Integrations" },
  { keys: "G → B", description: "Go to Billing" },
  { keys: "?", description: "Show keyboard shortcuts" },
  { keys: "Esc", description: "Close dialog / panel" },
];

const GO_ROUTES: Record<string, string> = {
  d: "/dashboard",
  s: "/supply-chain",
  p: "/procurement",
  o: "/operations",
  f: "/demand",
  a: "/automations",
  t: "/audit-trail",
  i: "/integrations",
  b: "/billing",
  c: "/configuration",
  m: "/machinery",
  w: "/workforce",
  r: "/reports",
};

export function useKeyboardShortcuts(onShowHelp?: () => void) {
  const [, setLocation] = useLocation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger in input fields
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      // G + <key> navigation
      if (pendingGo) {
        const route = GO_ROUTES[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          setLocation(route);
        }
        pendingGo = false;
        clearTimeout(goTimeout);
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        pendingGo = true;
        goTimeout = setTimeout(() => {
          pendingGo = false;
        }, 1000); // 1 second window for second key
        return;
      }

      // ? for help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }
    },
    [setLocation, onShowHelp],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
