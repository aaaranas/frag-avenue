"use client";

import { useFormStatus } from "react-dom";
import { connectGoogleAction } from "@/modules/auth";
import { GoogleG } from "./google-button";

/** Links Google to the signed-in account (profile → Sign-in methods). */
export function ConnectGoogleButton() {
  return (
    <form action={connectGoogleAction}>
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[color:var(--rule-strong)] px-4 text-sm font-medium hover:bg-[color:var(--bg-sunken)] disabled:opacity-60"
    >
      <GoogleG className="size-4" />
      {pending ? "Opening Google…" : "Connect Google"}
    </button>
  );
}
