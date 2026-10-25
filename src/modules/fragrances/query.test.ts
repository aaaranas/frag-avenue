import { describe, it, expect } from "vitest";
import { buildFragranceListWhere, paginationOffset, totalPages, visibleToUserWhere } from "./query";
import { DEFAULT_PAGE_SIZE, FragranceListInput } from "./schema";

const parse = (input: unknown) => FragranceListInput.parse(input);

describe("fragrance list query builder", () => {
  it("shows approved entries plus only the viewer's own pending ones", () => {
    expect(visibleToUserWhere("user_1")).toEqual({
      OR: [{ status: "APPROVED" }, { status: "PENDING", submittedById: "user_1" }],
    });
  });

  it("applies only visibility when q is missing or blank", () => {
    expect(buildFragranceListWhere(parse({}), "user_1")).toEqual(visibleToUserWhere("user_1"));
    expect(buildFragranceListWhere(parse({ q: "   " }), "user_1")).toEqual(
      visibleToUserWhere("user_1"),
    );
  });

  it("searches name and brand case-insensitively, always within the visible set", () => {
    const where = buildFragranceListWhere(parse({ q: "Aventus" }), "user_1");
    expect(where).toEqual({
      AND: [
        visibleToUserWhere("user_1"),
        {
          OR: [
            { name: { contains: "Aventus", mode: "insensitive" } },
            { brand: { is: { name: { contains: "Aventus", mode: "insensitive" } } } },
          ],
        },
      ],
    });
  });

  it("paginationOffset defaults to page 1 / DEFAULT_PAGE_SIZE", () => {
    expect(paginationOffset(parse({}))).toEqual({ skip: 0, take: DEFAULT_PAGE_SIZE });
  });

  it("paginationOffset advances by page", () => {
    expect(paginationOffset(parse({ page: 3, pageSize: 10 }))).toEqual({ skip: 20, take: 10 });
  });

  it("coerces invalid page/pageSize back to defaults instead of throwing", () => {
    const p = parse({ page: "banana", pageSize: "999" });
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("totalPages is at least 1 even when total is 0", () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(19, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
    expect(totalPages(200, 20)).toBe(10);
  });
});
