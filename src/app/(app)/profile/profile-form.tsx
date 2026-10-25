"use client";

import { useState } from "react";
import { updateProfileAction, type FormState } from "@/modules/users";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const INITIAL: FormState = { ok: false };

export type ProfileDefaults = {
  username: string;
  name: string;
  bio: string;
  defaultVisibility: "FOLLOWERS" | "PUBLIC" | "PRIVATE";
  units: "METRIC" | "IMPERIAL";
};

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const { state, pending, formProps } = useFormAction(updateProfileAction, INITIAL);
  const err = state.fieldErrors ?? {};
  return (
    <form {...formProps} className="flex flex-col gap-5" noValidate>
      <Field
        name="username"
        label="Username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        defaultValue={defaults.username}
        hint="3–20 letters, numbers, or _."
        error={err.username}
      />
      <Field
        name="name"
        label="Display name (optional)"
        maxLength={80}
        defaultValue={defaults.name}
        error={err.name}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="field-label">
          Bio (optional)
        </label>
        <Textarea
          id="bio"
          name="bio"
          rows={2}
          maxLength={200}
          defaultValue={defaults.bio}
          aria-invalid={err.bio ? true : undefined}
          aria-describedby={err.bio ? "bio-error" : undefined}
        />
        {err.bio ? (
          <p id="bio-error" role="alert" className="form-error">
            {err.bio}
          </p>
        ) : null}
      </div>
      <Choice
        name="defaultVisibility"
        legend="Who sees new wears by default"
        initial={defaults.defaultVisibility}
        options={[
          { value: "FOLLOWERS", label: "Followers" },
          { value: "PUBLIC", label: "Everyone" },
          { value: "PRIVATE", label: "Only me" },
        ]}
        error={err.defaultVisibility}
      />
      <Choice
        name="units"
        legend="Units"
        initial={defaults.units}
        options={[
          { value: "METRIC", label: "°C · ml" },
          { value: "IMPERIAL", label: "°F · fl oz" },
        ]}
        error={err.units}
      />
      {state.ok && state.message ? (
        <p role="status" className="text-sm text-[color:var(--fg-muted)]">
          {state.message}
        </p>
      ) : null}
      {state.message && !state.ok ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function Choice({
  name,
  legend,
  options,
  initial,
  error,
}: {
  name: string;
  legend: string;
  options: Array<{ value: string; label: string }>;
  initial: string;
  error?: string;
}) {
  const [selected, setSelected] = useState(initial);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="field-label mb-1">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "relative flex min-h-11 cursor-pointer items-center rounded-md border px-3 text-sm",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--focus)]",
              selected === o.value
                ? "border-[color:var(--accent-color)] bg-[color:var(--accent-wash)] font-medium"
                : "border-[color:var(--rule-strong)] hover:bg-[color:var(--bg-sunken)]",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected === o.value}
              onChange={() => setSelected(o.value)}
              className="absolute inset-0 cursor-pointer appearance-none opacity-0"
            />
            {o.label}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
