"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * `useActionState` without React 19's automatic form reset.
 *
 * React resets a `<form action={fn}>` after every action call — including one
 * that returns validation errors — so a typed value (a date, a price) silently
 * reverts to its default and a resubmit can save the wrong thing. Submitting
 * from `onSubmit` inside a transition skips that reset. The native `action`
 * stays on the form, so it still posts without JavaScript.
 */
export function useFormAction<S>(
  action: (state: Awaited<S>, formData: FormData) => S | Promise<S>,
  initial: Awaited<S>,
) {
  const [state, formAction, pending] = useActionState<S, FormData>(action, initial);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(data));
  };
  return { state, pending, formProps: { action: formAction, onSubmit } };
}
