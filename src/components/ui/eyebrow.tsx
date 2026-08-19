import { cn } from "@/lib/utils";

/**
 * Small tracked caps above a page title.
 *
 * Deliberately narrower in scope than it used to be: the same treatment was
 * previously applied to section headings, table columns, stat labels, and card
 * metadata alike, so everything on a page carried identical visual weight and
 * nothing read as more important than anything else.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("label-caps", className)}>{children}</p>;
}
