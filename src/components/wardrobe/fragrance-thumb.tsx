import Image from "next/image";
import { cn } from "@/lib/utils";
import { BottleGlyph } from "./bottle-glyph";

type Kind = "BOTTLE" | "DECANT" | "SAMPLE" | "WISHLIST";

/**
 * The catalogue photo when there is one, otherwise the outline glyph. Always
 * decorative: the fragrance name is printed next to it.
 */
export function FragranceThumb({
  imagePath,
  kind = "BOTTLE",
  fillRatio = null,
  size = "md",
  className,
}: {
  imagePath: string | null;
  kind?: Kind;
  fillRatio?: number | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const box = size === "lg" ? "h-56 w-40" : "h-24 w-16";
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[color:var(--bg-elev)]",
        box,
        className,
      )}
    >
      {imagePath ? (
        <Image
          src={imagePath}
          alt=""
          fill
          sizes={size === "lg" ? "160px" : "64px"}
          className="object-contain p-1"
        />
      ) : (
        <BottleGlyph kind={kind} fillRatio={fillRatio} className="h-[80%] w-auto" />
      )}
    </div>
  );
}
