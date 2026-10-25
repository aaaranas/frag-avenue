import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const pathname = vi.hoisted(() => ({ value: "/feed" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { PrimaryNav } from "./primary-nav";

function mobileTabs() {
  // Two navs share the "Primary" label: the mobile tab bar renders first.
  return screen.getAllByRole("navigation", { name: "Primary" })[0]!;
}

describe("PrimaryNav", () => {
  it("renders the five tabs as real links, with Log as the centre action", () => {
    pathname.value = "/feed";
    render(<PrimaryNav />);
    const links = within(mobileTabs()).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/feed",
      "/wardrobe",
      "/log",
      "/stats",
      "/clubs",
    ]);
    expect(within(mobileTabs()).getByRole("link", { name: "Log a wear" })).toHaveAttribute(
      "href",
      "/log",
    );
  });

  it("marks the current tab with aria-current, including on a sub-route", () => {
    pathname.value = "/fragrances/abc";
    render(<PrimaryNav />);
    const current = within(mobileTabs())
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Wardrobe");
  });

  it("offers Profile outside the tab bar", () => {
    pathname.value = "/feed";
    render(<PrimaryNav />);
    expect(screen.getAllByRole("link", { name: "Profile" }).length).toBeGreaterThan(0);
    expect(within(mobileTabs()).queryByRole("link", { name: "Profile" })).toBeNull();
  });
});
