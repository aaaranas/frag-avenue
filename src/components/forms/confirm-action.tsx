"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * A destructive server action behind a confirmation dialog. `trigger` is the
 * button that opens it; the action runs from the dialog's own form.
 *
 * The confirm button is a plain submit, not Radix's `AlertDialogAction`: that
 * closes the dialog on click, which can unmount the form before it submits.
 * The dialog stays open (button pending) until the action finishes, then
 * closes — unless the action redirected away first.
 */
export function ConfirmAction({
  action,
  fields,
  trigger,
  title,
  description,
  confirmLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  fields?: Record<string, string>;
  trigger: React.ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
        >
          {Object.entries(fields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Confirm label={confirmLabel} />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Confirm({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}
