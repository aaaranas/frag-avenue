"use client";

import { useActionState } from "react";
import { updateWearAction, type FormState } from "@/modules/wear-logs";
import { WearFormFields, type WearFieldDefaults } from "../../wear-form-fields";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

export function EditWearForm({
  wearId,
  fragranceId,
  collectionItemId,
  defaults,
}: {
  wearId: string;
  fragranceId: string;
  collectionItemId: string | null;
  defaults: WearFieldDefaults;
}) {
  const bound = updateWearAction.bind(null, wearId);
  const [state, action, pending] = useActionState(bound, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="fragranceId" value={fragranceId} />
      {collectionItemId ? (
        <input type="hidden" name="collectionItemId" value={collectionItemId} />
      ) : null}
      <WearFormFields defaults={defaults} state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
