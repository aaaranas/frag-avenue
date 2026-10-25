import { cn } from "@/lib/utils";

/**
 * The app icon's mark (public/icons/icon.svg), inline so it needs no request.
 * Fixed colours on purpose: it is the same tile as the home-screen icon. The
 * ring keeps the dark tile visible on the dark theme's background.
 */
export function AppMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={cn("rounded-[22%] ring-1 ring-[color:var(--rule-strong)]", className)}
    >
      <rect width="512" height="512" fill="#111111" />
      <rect x="168" y="108" width="56" height="248" fill="#fafafa" />
      <rect x="168" y="108" width="176" height="52" fill="#fafafa" />
      <rect x="168" y="212" width="136" height="48" fill="#fafafa" />
      <rect x="168" y="384" width="176" height="20" fill="#a5b4fc" />
    </svg>
  );
}
