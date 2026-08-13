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
 * Editorial page header. Eyebrow / title (serif) / optional supporting text.
 * `actions` land on the right on md+, below the title on mobile.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, className }: Props) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-2 font-serif text-3xl leading-[1.1] md:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="mt-3 max-w-xl text-sm text-[color:var(--fg-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
