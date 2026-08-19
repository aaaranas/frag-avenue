"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bottle } from "@/components/bottle/bottle";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SHAPE_LABEL, bottleAppearance, fillLabel, fillRatio } from "@/lib/bottle-appearance";
import type { CollectionListItem } from "@/modules/collection/data";

function formatMoney(minor: number | null, currency: string | null): string | null {
  if (minor === null || !currency) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function conditionLabel(c: "NEW" | "USED" | "DECANT"): string {
  return c === "NEW" ? "New" : c === "USED" ? "Used" : "Decant";
}

/**
 * Column counts must mirror the grid classes below (Tailwind's default md/lg
 * breakpoints). The detail panel spans the full width, so it has to be placed
 * after the last card of the selected card's row — otherwise opening the first
 * bottle in a four-column grid pushes the other three down and leaves a hole.
 */
const COLUMN_BREAKPOINTS = [
  { query: "(min-width: 1024px)", columns: 4 },
  { query: "(min-width: 768px)", columns: 3 },
] as const;

const BASE_COLUMNS = 2;

function useColumns(): number {
  const [columns, setColumns] = useState(BASE_COLUMNS);

  useEffect(() => {
    const queries = COLUMN_BREAKPOINTS.map((b) => ({
      columns: b.columns,
      mql: window.matchMedia(b.query),
    }));
    const update = () => setColumns(queries.find((q) => q.mql.matches)?.columns ?? BASE_COLUMNS);

    update();
    queries.forEach((q) => q.mql.addEventListener("change", update));
    return () => queries.forEach((q) => q.mql.removeEventListener("change", update));
  }, []);

  return columns;
}

export function CollectionShelf({ items }: { items: CollectionListItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const columns = useColumns();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectedIndex = items.findIndex((i) => i.id === selectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined;
  // Last card of the selected card's row, clamped to the final (possibly partial) row.
  const panelAfterIndex =
    selectedIndex < 0
      ? -1
      : Math.min(Math.floor(selectedIndex / columns) * columns + columns - 1, items.length - 1);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14 lg:grid-cols-4">
      {items.map((item, index) => (
        <Fragment key={item.id}>
          <BottleCard
            item={item}
            selected={item.id === selectedId}
            onSelect={() => setSelectedId((prev) => (prev === item.id ? null : item.id))}
          />
          {selected && index === panelAfterIndex ? (
            <DetailPanel item={selected} onClose={() => setSelectedId(null)} />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

function BottleCard({
  item,
  selected,
  onSelect,
}: {
  item: CollectionListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const bottle = bottleAppearance({
    concentration: item.fragrance.concentration,
    accords: item.fragrance.accords.map((a) => ({ name: a.accord.name, strength: a.strength })),
    bottleShape: item.fragrance.bottleShape,
    glassColor: item.fragrance.glassColor,
    capColor: item.fragrance.capColor,
    glassFinish: item.fragrance.glassFinish,
  });
  const ratio = fillRatio(item.bottleSizeMl, item.remainingMl);
  const fill = fillLabel(ratio);

  // The illustration is aria-hidden, so everything it encodes — silhouette,
  // concentration, and how full the bottle is — has to be said here instead.
  const description = [
    `${item.fragrance.brand.name} ${item.fragrance.name}`,
    `${item.bottleSizeMl} ml ${item.fragrance.concentration}`,
    conditionLabel(item.condition),
    SHAPE_LABEL[bottle.shape],
    fill
      ? `${fill.toLowerCase()}${item.remainingMl !== null ? `, ${item.remainingMl} ml left` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="group flex flex-col items-center text-center">
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        aria-label={description}
        className="flex flex-col items-center transition-transform hover:-translate-y-1"
      >
        <div className="relative flex h-48 items-end justify-center">
          <Bottle
            color={bottle.color}
            shape={bottle.shape}
            capColor={bottle.capColor}
            finish={bottle.finish}
            fillRatio={ratio}
            size={100}
            className={
              selected
                ? "drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
                : "drop-shadow-[0_6px_12px_rgba(0,0,0,0.1)] group-hover:drop-shadow-[0_10px_18px_rgba(0,0,0,0.16)]"
            }
          />
          {/* Shelf line */}
          <div
            aria-hidden
            className="absolute bottom-0 left-1/2 h-px w-24 -translate-x-1/2 bg-[color:var(--rule-strong)]"
          />
        </div>
        <p className="mt-5 text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
          {item.fragrance.brand.name}
        </p>
        <p className="mt-1 font-serif text-base leading-snug italic">{item.fragrance.name}</p>
        <p className="mt-1 text-[11px] text-[color:var(--fg-muted)]">
          <span className="tabular-nums">{item.bottleSizeMl}ml</span>
          <span className="mx-1.5 text-[color:var(--fg-faint)]">·</span>
          {conditionLabel(item.condition)}
          {fill ? (
            <>
              <span className="mx-1.5 text-[color:var(--fg-faint)]">·</span>
              <span>{fill}</span>
            </>
          ) : null}
        </p>
      </button>

      {/*
        Logging a wear is the core loop of the app, so it stays one click from
        the shelf rather than living behind the expand interaction. It sits
        outside the button because a link cannot be nested inside one.
      */}
      <Link
        href={{ pathname: "/wear/new", query: { collectionItemId: item.id } }}
        aria-label={`Log a wear of ${item.fragrance.brand.name} ${item.fragrance.name}`}
        className="mt-3 rounded-full border border-[color:var(--rule-strong)] px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-[color:var(--fg-muted)] transition-colors hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-wash)] hover:text-[color:var(--accent)] focus-visible:border-[color:var(--accent)]"
      >
        Log wear
      </Link>
    </div>
  );
}

function DetailPanel({ item, onClose }: { item: CollectionListItem; onClose: () => void }) {
  const money = formatMoney(item.purchasePriceMinor, item.currency);
  const top = item.fragrance.notes.filter((n) => n.layer === "TOP").map((n) => n.note.name);
  const middle = item.fragrance.notes.filter((n) => n.layer === "MIDDLE").map((n) => n.note.name);
  const base = item.fragrance.notes.filter((n) => n.layer === "BASE").map((n) => n.note.name);

  return (
    <div className="col-span-full">
      <div className="reveal-down rounded-sm border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow>{item.fragrance.brand.name}</Eyebrow>
            <h3 className="mt-1 font-serif text-2xl leading-tight md:text-3xl">
              {item.fragrance.name}
            </h3>
            <p className="mt-1 text-xs tracking-wide text-[color:var(--fg-muted)]">
              {item.fragrance.concentration}
              {item.fragrance.releaseYear ? ` · ${item.fragrance.releaseYear}` : ""}
              {item.fragrance.perfumer ? ` · ${item.fragrance.perfumer}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="shrink-0 rounded-sm border border-[color:var(--rule-strong)] p-1.5 text-[color:var(--fg-muted)] hover:bg-[color:var(--bg)] hover:text-[color:var(--fg)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          {/* Notes */}
          <div>
            <Eyebrow>Composition</Eyebrow>
            <div className="mt-3 flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
              <NoteRow label="Top" notes={top} />
              <NoteRow label="Heart" notes={middle} />
              <NoteRow label="Base" notes={base} />
            </div>

            {item.fragrance.accords.length > 0 ? (
              <div className="mt-6">
                <Eyebrow>Accords</Eyebrow>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {item.fragrance.accords.map((a) => (
                    <li key={a.accord.id}>
                      <Chip title={`Strength ${a.strength}/5`}>
                        {a.accord.name}
                        <span className="ml-1.5 text-[color:var(--fg-faint)]">
                          {"·".repeat(a.strength)}
                        </span>
                      </Chip>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Bottle facts */}
          <div>
            <Eyebrow>This bottle</Eyebrow>
            <dl className="mt-3 flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)] text-sm">
              <Row
                label="Size"
                value={<span className="tabular-nums">{item.bottleSizeMl} ml</span>}
              />
              {item.remainingMl !== null ? (
                <Row
                  label="Remaining"
                  value={<span className="tabular-nums">{item.remainingMl} ml</span>}
                />
              ) : null}
              <Row label="Condition" value={conditionLabel(item.condition)} />
              {money ? (
                <Row label="Price" value={<span className="tabular-nums">{money}</span>} />
              ) : null}
              {item.purchaseDate ? (
                <Row
                  label="Purchased"
                  value={new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    year: "numeric",
                  }).format(item.purchaseDate)}
                />
              ) : null}
              {item.personalRating ? (
                <Row
                  label="Rating"
                  value={
                    <span className="tabular-nums">
                      {item.personalRating}
                      <span className="text-[color:var(--fg-faint)]"> / 5</span>
                    </span>
                  }
                />
              ) : null}
            </dl>

            {item.personalNotes ? (
              <p className="mt-4 font-serif text-sm leading-relaxed text-[color:var(--fg-muted)] italic">
                &ldquo;{item.personalNotes}&rdquo;
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <Link href={{ pathname: "/wear/new", query: { collectionItemId: item.id } }}>
                  Log wear
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/collection/${item.id}/edit`}>Edit</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="ml-auto">
                <Link href={`/fragrances/${item.fragrance.id}`}>
                  Fragrance page <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteRow({ label, notes }: { label: string; notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="grid grid-cols-[4rem_1fr] items-baseline gap-4 py-3">
      <dt className="text-[10px] font-medium tracking-[0.22em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </dt>
      <dd className="font-serif leading-snug italic">{notes.join(", ")}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] items-baseline gap-4 py-2.5">
      <dt className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
