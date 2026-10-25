import { describe, expect, it } from "vitest";
import { PROFILE, TABS, isActive } from "./nav-items";

const activeTab = (path: string) => TABS.filter((t) => isActive(t, path)).map((t) => t.id);

describe("primary tabs", () => {
  it("are the five MVP tabs in order, with Log in the centre", () => {
    expect(TABS.map((t) => t.label)).toEqual(["Feed", "Wardrobe", "Log", "Stats", "Clubs"]);
    expect(TABS[2]!.id).toBe("log");
  });

  it("marks exactly one tab current for each new route", () => {
    expect(activeTab("/feed")).toEqual(["feed"]);
    expect(activeTab("/wardrobe")).toEqual(["wardrobe"]);
    expect(activeTab("/log")).toEqual(["log"]);
    expect(activeTab("/stats")).toEqual(["stats"]);
    expect(activeTab("/clubs")).toEqual(["clubs"]);
  });

  it("claims the legacy routes each tab still forwards to", () => {
    expect(activeTab("/dashboard")).toEqual(["feed"]);
    expect(activeTab("/advisor")).toEqual(["feed"]);
    expect(activeTab("/collection/abc/edit")).toEqual(["wardrobe"]);
    expect(activeTab("/fragrances/xyz")).toEqual(["wardrobe"]);
    expect(activeTab("/wear/new")).toEqual(["log"]);
    expect(activeTab("/insights")).toEqual(["stats"]);
  });

  it("matches whole path segments only", () => {
    expect(activeTab("/feedback")).toEqual([]);
    expect(activeTab("/wearables")).toEqual([]);
  });

  it("keeps Profile out of the tab bar", () => {
    expect(activeTab("/profile")).toEqual([]);
    expect(isActive(PROFILE, "/profile")).toBe(true);
  });
});
