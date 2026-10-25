"use client";

import { useEffect, useRef, useState } from "react";
import { addCommentAction, type FormState } from "@/modules/social";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

/** Add a comment. Keeps the text on error; clears it once posted. */
export function CommentForm({ wearId }: { wearId: string }) {
  const { state, pending, formProps } = useFormAction(addCommentAction, INITIAL);
  const [body, setBody] = useState("");
  const last = useRef(state);
  useEffect(() => {
    if (state !== last.current && state.ok) setBody("");
    last.current = state;
  }, [state]);
  const error = state.fieldErrors?.body ?? state.message;

  return (
    <form {...formProps} className="flex flex-col gap-2" noValidate>
      <input type="hidden" name="wearId" value={wearId} />
      <label htmlFor="comment-body" className="field-label">
        Add a comment
      </label>
      <textarea
        id="comment-body"
        name="body"
        rows={2}
        maxLength={1000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "comment-error" : undefined}
      />
      {error ? (
        <p id="comment-error" role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
