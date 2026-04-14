import { useRealtime } from "@/contexts/RealtimeContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const { isConnected, messageCount, reconnect } = useRealtime();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={!isConnected ? reconnect : undefined}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-destructive" />
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isConnected
          ? `Live connection active · ${messageCount} updates received`
          : "Disconnected · Click to reconnect"}
      </TooltipContent>
    </Tooltip>
  );
}
