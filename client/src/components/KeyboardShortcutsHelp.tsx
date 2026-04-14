import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Keyboard } from "lucide-react";
import { SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">General</h3>
            {SHORTCUTS.filter((s) => !s.keys.startsWith("G")).map((shortcut) => (
              <div key={shortcut.keys} className="flex items-center justify-between py-1.5">
                <span className="text-sm">{shortcut.description}</span>
                <kbd className="px-2 py-0.5 bg-muted border border-border rounded text-xs font-mono">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
          <Separator />
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Navigation (press G then...)</h3>
            {SHORTCUTS.filter((s) => s.keys.startsWith("G")).map((shortcut) => (
              <div key={shortcut.keys} className="flex items-center justify-between py-1.5">
                <span className="text-sm">{shortcut.description}</span>
                <kbd className="px-2 py-0.5 bg-muted border border-border rounded text-xs font-mono">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
