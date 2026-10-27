"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SHARE_FORMATS, type ShareCardData, type ShareFormat } from "./share-card";
import { BACKGROUNDS, type BackgroundId } from "./palette";

type Rendered = { file: File; url: string; format: ShareFormat; background: BackgroundId };

/**
 * "Share" on your own wear: makes a PNG — an Instagram Story (9:16) or a
 * feed post (4:5) — on a background of your choice, previews it, and hands it
 * to the phone's share sheet (pick Instagram → Story or Feed, or any app), or
 * saves it.
 *
 * The image is rendered as soon as the dialog opens and whenever a choice
 * changes, so "Share image" can call `navigator.share` straight from the tap:
 * iOS refuses a share that starts after the tap's moment has passed.
 */
export function ShareWearButton({
  card,
  variant = "ghost",
}: {
  card: ShareCardData;
  variant?: "ghost" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ShareFormat>("story");
  const [background, setBackground] = useState<BackgroundId>("bottle");
  const [image, setImage] = useState<Rendered | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const probe = new File([new Blob()], "probe.png", { type: "image/png" });
    setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
  }, []);

  useEffect(() => {
    if (!open) return;
    const g = ++generation.current;
    setImage(null);
    setError(null);
    // Loaded on first use, so the renderer stays out of the feed's bundle.
    import("./render-share-card")
      .then(({ renderShareCard }) => renderShareCard(card, format, background))
      .then((blob) => {
        if (g !== generation.current) return;
        const file = new File([blob], `${card.fileName}-${format}.png`, { type: "image/png" });
        setImage({ file, url: URL.createObjectURL(blob), format, background });
      })
      .catch((err: unknown) => {
        console.error(err);
        if (g === generation.current) setError("Couldn't make the image.");
      });
  }, [open, format, background, card, attempt]);

  // Free each preview once it is replaced or the dialog unmounts.
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );

  // The image for the current choices. Just after a change the previous one is
  // still in state for a render, and must not be shown or shared as this one.
  const ready = image?.format === format && image.background === background ? image : null;

  async function share() {
    if (!ready) return;
    try {
      // Files only: Instagram drops a share that also carries text or a URL.
      await navigator.share({ files: [ready.file] });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("This browser couldn't share the image. Save it instead.");
      }
    }
  }

  function save() {
    if (!ready) return;
    const a = document.createElement("a");
    a.href = ready.url;
    a.download = ready.file.name;
    document.body.append(a);
    a.click();
    a.remove();
  }

  const { width, height, hint } = SHARE_FORMATS[format];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "outline" ? (
          <Button variant="outline" aria-label={`Share ${card.name}`}>
            <Share aria-hidden />
            Share
          </Button>
        ) : (
          <button
            type="button"
            aria-label={`Share ${card.name}`}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-sunken)] hover:text-[color:var(--fg)]"
          >
            <Share className="size-4" aria-hidden />
            Share
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this wear</DialogTitle>
          <DialogDescription>Pick a size and a background.</DialogDescription>
        </DialogHeader>

        <Choice
          legend="Size"
          name="share-format"
          value={format}
          onChange={(v) => setFormat(v as ShareFormat)}
          options={(Object.keys(SHARE_FORMATS) as ShareFormat[]).map((f) => ({
            value: f,
            label: SHARE_FORMATS[f].label,
            hint: f === "story" ? "9:16" : "4:5",
          }))}
          columns={2}
        />
        <Choice
          legend="Background"
          name="share-background"
          value={background}
          onChange={(v) => setBackground(v as BackgroundId)}
          options={BACKGROUNDS.map((b) => ({ value: b.id, label: b.label }))}
          columns={4}
        />

        <div
          className="mx-auto flex w-full items-center justify-center"
          aria-live="polite"
          aria-busy={!ready && !error}
        >
          {ready ? (
            // A blob: URL, so next/image has nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ready.url}
              alt={`Preview: ${card.house} ${card.name}, ${width}×${height}`}
              className="max-h-[40dvh] w-auto max-w-full rounded-lg shadow-md ring-1 ring-[color:var(--rule)]"
            />
          ) : (
            <div
              className="flex max-w-full flex-col items-center justify-center gap-3 rounded-lg bg-[color:var(--bg-sunken)] p-4 text-center text-sm text-[color:var(--fg-muted)]"
              style={{ aspectRatio: `${width} / ${height}`, height: "40dvh" }}
            >
              {error ? (
                <>
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                    Try again
                  </Button>
                </>
              ) : (
                "Making your image…"
              )}
            </div>
          )}
        </div>
        {ready && error ? (
          <p role="alert" className="form-error text-center">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          {canShare ? (
            <Button onClick={share} disabled={!ready} className="flex-1">
              <Share aria-hidden />
              Share image
            </Button>
          ) : null}
          <Button
            variant={canShare ? "outline" : "default"}
            onClick={save}
            disabled={!ready}
            className="flex-1"
          >
            <Download aria-hidden />
            Save image
          </Button>
        </div>
        <p className="text-center text-xs text-[color:var(--fg-muted)]">
          {canShare
            ? `In the share sheet, pick ${hint}.`
            : `Save it, then post it from your phone (${width}×${height} PNG).`}
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** A row of radio chips, the same control the log form uses. */
function Choice({
  legend,
  name,
  value,
  onChange,
  options,
  columns,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; hint?: string }>;
  columns: 2 | 4;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="field-label mb-1">{legend}</legend>
      <div
        className={cn(
          "grid gap-2",
          columns === 2
            ? "grid-cols-[repeat(2,minmax(0,1fr))]"
            : "grid-cols-[repeat(4,minmax(0,1fr))]",
        )}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "relative flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--focus)]",
              value === o.value
                ? "border-[color:var(--accent-color)] bg-[color:var(--accent-wash)] font-medium"
                : "border-[color:var(--rule-strong)] hover:bg-[color:var(--bg-sunken)]",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="absolute inset-0 cursor-pointer appearance-none opacity-0"
            />
            <span>{o.label}</span>
            {o.hint ? (
              <span className="text-xs font-normal text-[color:var(--fg-muted)]">{o.hint}</span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
