"use client";

import { useActionState } from "react";
import { logWearAction, type FormState } from "@/modules/wear-logs";
import { WearFormFields, type WearFieldDefaults } from "../wear-form-fields";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

export function LogWearForm({
  fragranceId,
  collectionItemId,
  defaults,
}: {
  fragranceId: string;
  collectionItemId?: string;
  defaults: WearFieldDefaults;
}) {
  const [state, action, pending] = useActionState(logWearAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="fragranceId" value={fragranceId} />
      {collectionItemId ? (
        <input type="hidden" name="collectionItemId" value={collectionItemId} />
      ) : null}

      <WearFormFields defaults={defaults} state={state} />

      <Button type="submit" disabled={pending}>
        {pending ? "Logging…" : "Log wear"}
      </Button>
    </form>
  );
}
