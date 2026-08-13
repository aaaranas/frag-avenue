"use client";

import { useActionState } from "react";
import { logWearAction, type FormState } from "@/modules/wear-logs";
import { WearFormFields, type WearFieldDefaults } from "../wear-form-fields";

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

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-sm bg-[color:var(--fg)] px-5 py-3 text-sm font-medium tracking-wide text-[color:var(--bg)] transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Logging…" : "Log wear"}
      </button>
    </form>
  );
}
