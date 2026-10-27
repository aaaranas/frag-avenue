/** Fitting a title into a box on a canvas. Pure: the caller supplies `measure`. */

export type Measure = (text: string, size: number) => number;

/** Greedy word wrap at `size`. A word wider than the box gets a line of its own. */
export function wrap(measure: Measure, text: string, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || measure(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The largest size from `maxSize` down to `minSize` (in `step`s) at which
 * `text` fits in `maxLines` lines of `maxWidth`. If even `minSize` needs more
 * lines, the last line is cut with an ellipsis so it fits.
 */
export function fitText(
  measure: Measure,
  text: string,
  opts: { maxWidth: number; maxSize: number; minSize: number; maxLines: number; step?: number },
): { size: number; lines: string[] } {
  const step = opts.step ?? 2;
  for (let size = opts.maxSize; size >= opts.minSize; size -= step) {
    const lines = wrap(measure, text, size, opts.maxWidth);
    if (lines.length <= opts.maxLines && lines.every((l) => measure(l, size) <= opts.maxWidth)) {
      return { size, lines };
    }
  }
  const size = opts.minSize;
  const lines = wrap(measure, text, size, opts.maxWidth);
  const kept = lines.slice(0, opts.maxLines);
  const rest = lines.slice(opts.maxLines - 1).join(" ");
  let last = rest;
  while (last.length > 1 && measure(`${last}…`, size) > opts.maxWidth)
    last = last.slice(0, -1).trimEnd();
  kept[kept.length - 1] = last === rest && measure(rest, size) <= opts.maxWidth ? rest : `${last}…`;
  return { size, lines: kept };
}
