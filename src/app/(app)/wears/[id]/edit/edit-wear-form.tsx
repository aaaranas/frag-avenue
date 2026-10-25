"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import type { FormState } from "@/modules/wear-logs";
import { WearFields, type WearFieldDefaults } from "@/components/wear/wear-fields";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

export function EditWearForm({
  action: update,
  defaults,
}: {
  /** `updateWearAction` bound to the wear id, on the server. */
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: WearFieldDefaults;
}) {
  const { state, pending, formProps } = useFormAction(update, INITIAL);
  return (
    <form {...formProps} className="flex flex-col gap-6" noValidate>
      <WearFields defaults={defaults} errors={state.fieldErrors ?? {}} />
      {state.message ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
