import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

type Props = {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Page header. Eyebrow / title (serif) / optional supporting text, with a short
 * brand-green rule above the eyebrow so every page opens on the same note and
 * the top of the page has one piece of colour to anchor it.
 *
 * `actions` sit on the right from md up and wrap below the title on mobile.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, className }: Props) {
  return (
    <header
      className={cn(
        "mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-8",
        className,
      )}
    >
      <div className="min-w-0">
        <div aria-hidden className="mb-4 h-[3px] w-10 rounded-full bg-[color:var(--brand)]" />
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-2 font-serif text-3xl leading-[1.1] tracking-tight md:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--fg-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
