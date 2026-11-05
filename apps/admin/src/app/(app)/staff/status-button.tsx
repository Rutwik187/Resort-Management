"use client";

import { useState, useTransition } from "react";
import { UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { setStaffActive } from "./actions";

/** Deactivating signs the person out at once, so it asks first; reactivating doesn't. */
export function StaffStatusButton({ userId, name, active }: { userId: string; name: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const run = () =>
    start(async () => {
      await setStaffActive(userId, !active);
      setOpen(false);
      toast.success(active ? `${name} is deactivated and signed out.` : `${name} can sign in again.`);
    });

  if (!active) {
    return (
      <Button variant="outline" size="sm" disabled={pending} onClick={run}>
        <UserCheck />
        Reactivate
      </Button>
    );
  }
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <UserX />
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {name}?</AlertDialogTitle>
          <AlertDialogDescription>They are signed out at once and can&apos;t sign in until a Super Admin reactivates them. Their bookings and changes stay on record.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep them</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              run();
            }}
            disabled={pending}
          >
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
