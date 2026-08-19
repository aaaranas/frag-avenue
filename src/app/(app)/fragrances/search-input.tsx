"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export function SearchInput({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const currentParams = useSearchParams();
  const [value, setValue] = useState(initialQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const sp = new URLSearchParams(currentParams.toString());
      if (value.trim()) sp.set("q", value.trim());
      else sp.delete("q");
      sp.delete("page");
      const qs = sp.toString();
      router.replace(qs ? `/fragrances?${qs}` : `/fragrances`);
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <label htmlFor="fragrance-search" className="sr-only">
        Search fragrances
      </label>
      <Search
        aria-hidden
        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[color:var(--fg-faint)]"
      />
      <input
        id="fragrance-search"
        type="search"
        inputMode="search"
        placeholder="Search by fragrance or brand…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="field-input pl-9"
      />
    </div>
  );
}
