import { useState, useEffect, useRef } from "react";
import { isOnline, onConnectivityChange } from "@/lib/performanceUtils";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [showBanner, setShowBanner] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const cleanup = onConnectivityChange((isOnline) => {
      setOnline(isOnline);
      if (!isOnline) {
        setShowBanner(true);
      } else {
        // Keep banner visible briefly when coming back online
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => setShowBanner(false), 3000);
      }
    });
    return () => {
      cleanup();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border transition-all duration-300 ${
        online
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
      }`}
    >
      {online ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Back online — syncing data...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">You're offline — showing cached data</span>
        </>
      )}
    </div>
  );
}
