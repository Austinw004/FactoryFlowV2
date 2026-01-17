import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LayoutGrid, Loader2 } from "lucide-react";

interface TrelloConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrelloConfigDialog({ open, onOpenChange }: TrelloConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [defaultBoardId, setDefaultBoardId] = useState("");
  const [syncCards, setSyncCards] = useState(true);
  const [syncLists, setSyncLists] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/trello/test", {
        apiKey,
        apiToken,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Trello API credentials verified" });
      } else {
        toast({ title: "Connection failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/trello/configure", {
        apiKey,
        apiToken,
        defaultBoardId,
        syncOptions: { syncCards, syncLists },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Trello configured", description: "Integration saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Configuration failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-blue-500" />
            Configure Trello
          </DialogTitle>
          <DialogDescription>
            Connect Trello to visualize procurement workflows with Kanban boards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trello-api-key">API Key</Label>
            <Input
              id="trello-api-key"
              type="password"
              placeholder="Enter your Trello API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-trello-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trello-api-token">API Token</Label>
            <Input
              id="trello-api-token"
              type="password"
              placeholder="Enter your Trello API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              data-testid="input-trello-api-token"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trello-board">Default Board ID (Optional)</Label>
            <Input
              id="trello-board"
              placeholder="Enter default board ID"
              value={defaultBoardId}
              onChange={(e) => setDefaultBoardId(e.target.value)}
              data-testid="input-trello-board"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="trello-cards">Sync cards</Label>
            <Switch
              id="trello-cards"
              checked={syncCards}
              onCheckedChange={setSyncCards}
              data-testid="switch-trello-cards"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="trello-lists">Sync lists</Label>
            <Switch
              id="trello-lists"
              checked={syncLists}
              onCheckedChange={setSyncLists}
              data-testid="switch-trello-lists"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!apiKey || !apiToken || testMutation.isPending}
            data-testid="button-trello-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!apiKey || !apiToken || saveMutation.isPending}
            data-testid="button-trello-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
