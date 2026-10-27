import { cn } from "@/lib/utils";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * The title row of a tab page: a semibold title, optional one-line support
 * text, and actions on the right at every width (they wrap under the title
 * only when there is no room). No eyebrow: the tab bar already says where you
 * are.
 */
export function PageHeader({ title, subtitle, actions, className }: Props) {
  return (
    <header
      className={cn("mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3", className)}
    >
      <div className="min-w-0 flex-1 basis-48">
        <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight font-stretch-semi-condensed md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-xl text-sm text-[color:var(--fg-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
