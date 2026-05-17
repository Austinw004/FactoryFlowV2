/**
 * DeleteAccountSection — UI for the GDPR Article 17 self-deletion flow.
 *
 * Wires the three endpoints introduced in server/lib/accountDeletion.ts:
 *   GET  /api/users/me/delete/status — status query
 *   POST /api/users/me/delete         — request deletion (30-day grace)
 *   POST /api/users/me/delete/cancel  — cancel pending deletion
 *
 * Surfaced in Settings → Data & Privacy. Two states:
 *   1. No pending request: red "Delete account" button → confirm dialog
 *      (with optional reason textarea) → POST /delete → success toast.
 *   2. Pending: amber notice card showing "scheduled for <date>"
 *      + days remaining + "Cancel deletion" button.
 *
 * 409 from POST /delete means sole-admin-with-other-members: show the
 * server's explanatory message in the toast (user needs to transfer admin
 * before they can delete).
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DeletionStatus {
  status: "none" | "pending" | "cancelled" | "completed";
  requestedAt?: string;
  scheduledFor?: string;
  daysRemaining?: number;
}

export function DeleteAccountSection() {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading } = useQuery<DeletionStatus>({
    queryKey: ["/api/users/me/delete/status"],
  });

  const requestDeletion = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users/me/delete", {
        reason: reason.trim() || undefined,
      });
      const body = await res.json();
      if (!res.ok) {
        const err: any = new Error(body?.message ?? "Couldn't request account deletion.");
        err.code = body?.error;
        throw err;
      }
      return body;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/delete/status"] });
      setConfirmOpen(false);
      setReason("");
      toast({
        title: "Account deletion scheduled",
        description: data.message ?? "Your account is scheduled for deletion in 30 days. You can cancel any time before then.",
      });
    },
    onError: (err: any) => {
      // 409 sole-admin gate — show the server's explanation in the toast,
      // don't close the dialog so the user can read it inline.
      toast({
        variant: "destructive",
        title: err.code === "DELETION_BLOCKED" ? "Can't delete account yet" : "Couldn't schedule deletion",
        description: err.message ?? "Something went wrong. Please try again.",
      });
    },
  });

  const cancelDeletion = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users/me/delete/cancel", {});
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message ?? "Couldn't cancel deletion.");
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/delete/status"] });
      toast({
        title: "Deletion cancelled",
        description: "Your account remains active.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Couldn't cancel deletion",
        description: err.message ?? "Something went wrong.",
      });
    },
  });

  if (isLoading) return null;

  const isPending = data?.status === "pending";

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="w-4 h-4" />
          Delete your account
        </CardTitle>
        <CardDescription>
          Permanently remove your account and all associated data. Required by
          GDPR Article 17 and CCPA right-to-delete. 30-day grace period — you
          can cancel any time before then.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <>
            <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-foreground">
                  Account deletion is scheduled
                </div>
                <div className="text-sm mt-1 text-muted-foreground">
                  Your account will be permanently deleted on{" "}
                  <strong className="text-foreground">
                    {data?.scheduledFor
                      ? new Date(data.scheduledFor).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "the scheduled date"}
                  </strong>
                  {data?.daysRemaining !== undefined && (
                    <> ({data.daysRemaining} day{data.daysRemaining === 1 ? "" : "s"} remaining)</>
                  )}
                  . All sessions, data, and company resources owned by you will be
                  removed. To keep your account, cancel below.
                </div>
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              onClick={() => cancelDeletion.mutate()}
              disabled={cancelDeletion.isPending}
              data-testid="button-cancel-deletion"
            >
              {cancelDeletion.isPending ? "Cancelling…" : "Cancel deletion"}
            </Button>
          </>
        ) : (
          <>
            <Alert className="border-muted-foreground/20 bg-muted/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Once requested, your account is scheduled for deletion 30 days
                later. You can cancel during that window. After deletion, your
                user record, sessions, role assignments, and any company
                resources you own will be permanently removed. Cannot be
                undone.
              </AlertDescription>
            </Alert>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-account">
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your account will be scheduled for deletion in 30 days. You
                    can cancel during that window from Settings → Data &
                    Privacy. After 30 days, all your data is permanently
                    removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="deletion-reason" className="text-sm">
                    Reason (optional)
                  </Label>
                  <Textarea
                    id="deletion-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Help us improve — why are you deleting your account?"
                    maxLength={1000}
                    rows={3}
                    data-testid="textarea-deletion-reason"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-deletion-cancel-dialog">
                    Keep my account
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      requestDeletion.mutate();
                    }}
                    disabled={requestDeletion.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-deletion-confirm"
                  >
                    {requestDeletion.isPending ? "Scheduling…" : "Schedule deletion"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
