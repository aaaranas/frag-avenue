import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VIEWPORT, stubViewportWidth } from "@/tests/helpers/match-media";
import type { CollectionListItem } from "@/modules/collection/data";
import { CollectionShelf } from "./collection-shelf";

// next/link needs an app-router context to be clicked. These tests care about
// the hrefs, not navigation, so a plain anchor is the honest stand-in.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname: string; query?: Record<string, string> };
    children: React.ReactNode;
  }) => {
    const url =
      typeof href === "string" ? href : `${href.pathname}?${new URLSearchParams(href.query ?? {})}`;
    return (
      <a href={url} {...rest}>
        {children}
      </a>
    );
  },
}));

let nextId = 0;

function item(overrides: Partial<CollectionListItem> = {}): CollectionListItem {
  nextId += 1;
  const base = {
    id: `item_${nextId}`,
    bottleSizeMl: 100,
    remainingMl: 60,
    purchasePriceMinor: 1_500_000,
    currency: "PHP",
    condition: "NEW",
    personalRating: 4,
    personalNotes: null,
    purchaseDate: new Date("2026-01-15T00:00:00Z"),
    createdAt: new Date("2026-01-15T00:00:00Z"),
    fragrance: {
      id: `frag_${nextId}`,
      name: `Fragrance ${nextId}`,
      concentration: "EDP",
      releaseYear: 2015,
      perfumer: "A Perfumer",
      brand: { id: `brand_${nextId}`, name: `Brand ${nextId}` },
      notes: [
        { layer: "TOP", note: { id: "n1", name: "bergamot" } },
        { layer: "MIDDLE", note: { id: "n2", name: "jasmine" } },
        { layer: "BASE", note: { id: "n3", name: "cedar" } },
      ],
      accords: [
        { strength: 5, accord: { id: "a1", name: "woody" } },
        { strength: 3, accord: { id: "a2", name: "citrus" } },
      ],
    },
  };
  return { ...base, ...overrides } as CollectionListItem;
}

function items(n: number): CollectionListItem[] {
  return Array.from({ length: n }, () => item());
}

/** The detail panel is the full-width child of the grid. */
function gridChildren(container: HTMLElement): Element[] {
  const grid = container.querySelector(".grid")!;
  return [...grid.children];
}

function panelIndex(container: HTMLElement): number {
  return gridChildren(container).findIndex((el) => el.classList.contains("col-span-full"));
}

beforeEach(() => {
  nextId = 0;
  stubViewportWidth(VIEWPORT.desktop);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CollectionShelf", () => {
  it("renders one card per bottle with its brand, name, size and condition", () => {
    render(<CollectionShelf items={items(3)} />);

    const cards = screen.getAllByRole("button", { expanded: false });
    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByText("Brand 1")).toBeInTheDocument();
    expect(within(cards[0]!).getByText("Fragrance 1")).toBeInTheDocument();
    expect(within(cards[0]!).getByText(/100ml/)).toBeInTheDocument();
    expect(within(cards[0]!).getByText(/New/)).toBeInTheDocument();
  });

  it("opens a detail panel on click and marks the card expanded", async () => {
    const user = userEvent.setup();
    render(<CollectionShelf items={items(2)} />);

    await user.click(screen.getAllByRole("button", { expanded: false })[0]!);

    expect(screen.getByRole("heading", { name: "Fragrance 1" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
  });

  it("closes the panel when the same card is clicked again", async () => {
    const user = userEvent.setup();
    render(<CollectionShelf items={items(2)} />);

    const card = screen.getAllByRole("button", { expanded: false })[0]!;
    await user.click(card);
    await user.click(card);

    expect(screen.queryByRole("heading", { name: "Fragrance 1" })).not.toBeInTheDocument();
  });

  it("switches the panel to the other bottle when a second card is clicked", async () => {
    const user = userEvent.setup();
    render(<CollectionShelf items={items(2)} />);

    await user.click(screen.getAllByRole("button")[0]!);
    await user.click(screen.getAllByRole("button", { expanded: false })[0]!);

    expect(screen.queryByRole("heading", { name: "Fragrance 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fragrance 2" })).toBeInTheDocument();
  });

  it("closes the panel on Escape", async () => {
    const user = userEvent.setup();
    render(<CollectionShelf items={items(2)} />);

    await user.click(screen.getAllByRole("button")[0]!);
    expect(screen.getByRole("heading", { name: "Fragrance 1" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("heading", { name: "Fragrance 1" })).not.toBeInTheDocument();
  });

  it("closes the panel from its own close button", async () => {
    const user = userEvent.setup();
    render(<CollectionShelf items={items(2)} />);

    await user.click(screen.getAllByRole("button")[0]!);
    await user.click(screen.getByRole("button", { name: /close detail/i }));

    expect(screen.queryByRole("heading", { name: "Fragrance 1" })).not.toBeInTheDocument();
  });

  describe("panel row placement", () => {
    // The panel spans the full grid width, so it has to land after the LAST
    // card of the selected card's row. Putting it immediately after the
    // selected card would push the rest of that row down and leave a hole.
    it("inserts after the last card of the row at 4 columns", async () => {
      const user = userEvent.setup();
      const { container } = render(<CollectionShelf items={items(8)} />);

      // Card index 1 sits in row 0, which ends at index 3.
      await user.click(screen.getAllByRole("button")[1]!);

      expect(panelIndex(container)).toBe(4);
    });

    it("inserts after the last card of the second row at 4 columns", async () => {
      const user = userEvent.setup();
      const { container } = render(<CollectionShelf items={items(8)} />);

      // Card index 5 sits in row 1, which ends at index 7.
      await user.click(screen.getAllByRole("button")[5]!);

      expect(panelIndex(container)).toBe(8);
    });

    it("follows the 3-column layout on a tablet viewport", async () => {
      stubViewportWidth(VIEWPORT.tablet);
      const user = userEvent.setup();
      const { container } = render(<CollectionShelf items={items(8)} />);

      // At 3 columns, card index 1 is in row 0, which now ends at index 2.
      await user.click(screen.getAllByRole("button")[1]!);

      expect(panelIndex(container)).toBe(3);
    });

    it("follows the 2-column layout on a mobile viewport", async () => {
      stubViewportWidth(VIEWPORT.mobile);
      const user = userEvent.setup();
      const { container } = render(<CollectionShelf items={items(8)} />);

      await user.click(screen.getAllByRole("button")[1]!);

      expect(panelIndex(container)).toBe(2);
    });

    it("clamps to the final card when the last row is partial", async () => {
      const user = userEvent.setup();
      // 6 items at 4 columns: row 1 holds indices 4 and 5 only. The naive
      // "row start + columns - 1" would be index 7, which does not exist.
      const { container } = render(<CollectionShelf items={items(6)} />);

      await user.click(screen.getAllByRole("button")[4]!);

      expect(panelIndex(container)).toBe(6);
      expect(screen.getByRole("heading", { name: "Fragrance 5" })).toBeInTheDocument();
    });
  });

  describe("detail panel content", () => {
    it("groups notes into top, heart and base", async () => {
      const user = userEvent.setup();
      render(<CollectionShelf items={[item()]} />);

      await user.click(screen.getByRole("button"));

      expect(screen.getByText("bergamot")).toBeInTheDocument();
      expect(screen.getByText("jasmine")).toBeInTheDocument();
      expect(screen.getByText("cedar")).toBeInTheDocument();
      expect(screen.getByText("Heart")).toBeInTheDocument();
    });

    it("formats the purchase price in its stored currency", async () => {
      const user = userEvent.setup();
      render(<CollectionShelf items={[item()]} />);

      await user.click(screen.getByRole("button"));

      // 1_500_000 minor units of PHP is ₱15,000.00 — money is stored as
      // integer minor units and only divided for display.
      expect(screen.getByText(/15,000\.00/)).toBeInTheDocument();
    });

    it("omits the price row when the item has no recorded price", async () => {
      const user = userEvent.setup();
      render(<CollectionShelf items={[item({ purchasePriceMinor: null, currency: null })]} />);

      await user.click(screen.getByRole("button"));

      expect(screen.queryByText("Price")).not.toBeInTheDocument();
    });

    it("omits the remaining row when the volume is unknown", async () => {
      const user = userEvent.setup();
      render(<CollectionShelf items={[item({ remainingMl: null })]} />);

      await user.click(screen.getByRole("button"));

      expect(screen.queryByText("Remaining")).not.toBeInTheDocument();
      expect(screen.getByText("Size")).toBeInTheDocument();
    });

    it("links to logging a wear for this specific bottle", async () => {
      const user = userEvent.setup();
      const only = item();
      render(<CollectionShelf items={[only]} />);

      await user.click(screen.getByRole("button"));

      expect(screen.getByRole("link", { name: /log wear/i })).toHaveAttribute(
        "href",
        `/wear/new?collectionItemId=${only.id}`,
      );
      expect(screen.getByRole("link", { name: /^edit$/i })).toHaveAttribute(
        "href",
        `/collection/${only.id}/edit`,
      );
      expect(screen.getByRole("link", { name: /fragrance page/i })).toHaveAttribute(
        "href",
        `/fragrances/${only.fragrance.id}`,
      );
    });
  });

  describe("fill level", () => {
    it("shows how full the bottle is under the card", () => {
      render(<CollectionShelf items={[item({ bottleSizeMl: 100, remainingMl: 60 })]} />);

      expect(screen.getByText(/Part used/)).toBeInTheDocument();
    });

    it("says nothing about the level when the volume was never recorded", () => {
      // Silence is correct here — an untracked bottle is not an empty one.
      render(<CollectionShelf items={[item({ remainingMl: null })]} />);

      expect(screen.queryByText(/Part used|Running low|Empty|Full/)).not.toBeInTheDocument();
    });

    it("calls an empty bottle empty", () => {
      render(<CollectionShelf items={[item({ bottleSizeMl: 100, remainingMl: 0 })]} />);

      expect(screen.getByText(/^Empty$/)).toBeInTheDocument();
    });
  });

  describe("accessible naming", () => {
    it("names the card with everything the illustration encodes", () => {
      // The SVG is aria-hidden, so silhouette, concentration and fill level have
      // to reach assistive tech through the button's name instead.
      render(
        <CollectionShelf
          items={[item({ bottleSizeMl: 100, remainingMl: 60, condition: "USED" })]}
        />,
      );

      const name = screen.getAllByRole("button")[0]!.getAttribute("aria-label")!;
      expect(name).toContain("Brand 1 Fragrance 1");
      expect(name).toContain("100 ml EDP");
      expect(name).toContain("Used");
      expect(name).toContain("rectangular flacon");
      expect(name).toContain("part used");
      expect(name).toContain("60 ml left");
    });

    it("omits the fill clause when the level is unknown", () => {
      render(<CollectionShelf items={[item({ remainingMl: null })]} />);

      const name = screen.getAllByRole("button")[0]!.getAttribute("aria-label")!;
      expect(name).not.toMatch(/ml left/);
    });
  });

  describe("one-click log wear", () => {
    it("puts a log-wear link on every card without needing the panel open", () => {
      // Logging is the core loop; it should not cost an extra click behind the
      // expand interaction.
      const list = items(3);
      render(<CollectionShelf items={list} />);

      const links = screen.getAllByRole("link", { name: /^Log a wear of/ });
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute("href", `/wear/new?collectionItemId=${list[0]!.id}`);
    });

    it("names each card's link after its own bottle", () => {
      render(<CollectionShelf items={items(2)} />);

      expect(
        screen.getByRole("link", { name: "Log a wear of Brand 2 Fragrance 2" }),
      ).toHaveAttribute("href", expect.stringContaining("collectionItemId="));
    });
  });

  it("renders nothing but an empty grid for an empty collection", () => {
    const { container } = render(<CollectionShelf items={[]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(gridChildren(container)).toHaveLength(0);
  });
});
