import { describe, it, expect } from "vitest";
import { parseCatalogue } from "./catalogue-csv";
import { planCatalogue, type DesiredFragrance, type ExistingFragrance } from "./catalogue-plan";

function desired(csvRow: string, imagePath: string | null = null): DesiredFragrance {
  const { entries, errors } = parseCatalogue(
    `house,fragrance,concentration,year,gender,top notes,base notes,accords\n${csvRow}\n`,
  );
  expect(errors).toEqual([]);
  return { ...entries[0]!, imagePath };
}

/** The DB state that applying `entry` would leave, for "already in sync" cases. */
function inSync(entry: DesiredFragrance, id = "f1"): ExistingFragrance {
  return {
    id,
    name: entry.name,
    concentration: entry.concentration,
    releaseYear: entry.releaseYear,
    perfumer: entry.perfumer,
    gender: entry.gender,
    imagePath: entry.imagePath,
    status: "APPROVED",
    notes: [
      ...entry.notes.top.map((n) => ({ slug: n.toLowerCase(), layer: "TOP" as const })),
      ...entry.notes.base.map((n) => ({ slug: n.toLowerCase(), layer: "BASE" as const })),
    ],
    accords: entry.accords.map((a) => ({ slug: a.name.toLowerCase(), strength: a.strength })),
  };
}

const aventus = desired("Creed,Aventus,EDP,2010,masculine,bergamot,musk,fruity:5; woody:4");

describe("planCatalogue", () => {
  it("creates what the database doesn't have", () => {
    const plan = planCatalogue([aventus], new Map());
    expect(plan.create).toEqual([aventus]);
    expect(plan.update).toEqual([]);
    expect(plan.unchanged).toBe(0);
  });

  it("leaves a row alone when it already matches", () => {
    const plan = planCatalogue([aventus], new Map([["creed/aventus", inSync(aventus)]]));
    expect(plan).toEqual({ create: [], update: [], unchanged: 1 });
  });

  it("updates only the fields that differ", () => {
    const current = { ...inSync(aventus), releaseYear: 2009, concentration: "OTHER" };
    const plan = planCatalogue([aventus], new Map([["creed/aventus", current]]));
    expect(plan.update).toEqual([
      {
        id: "f1",
        entry: aventus,
        fields: { releaseYear: 2010, concentration: "EDP" },
        relink: false,
      },
    ]);
  });

  it("approves a matching row that was still pending review", () => {
    const current = { ...inSync(aventus), status: "PENDING" };
    const plan = planCatalogue([aventus], new Map([["creed/aventus", current]]));
    expect(plan.update[0]!.fields).toEqual({ status: "APPROVED" });
  });

  it("relinks when notes or accord strengths change, ignoring order", () => {
    const reordered = {
      ...inSync(aventus),
      accords: [...inSync(aventus).accords].reverse(),
      notes: [...inSync(aventus).notes].reverse(),
    };
    expect(planCatalogue([aventus], new Map([["creed/aventus", reordered]])).unchanged).toBe(1);

    const weaker = {
      ...inSync(aventus),
      accords: [
        { slug: "fruity", strength: 5 },
        { slug: "woody", strength: 3 },
      ],
    };
    const plan = planCatalogue([aventus], new Map([["creed/aventus", weaker]]));
    expect(plan.update[0]).toMatchObject({ fields: {}, relink: true });

    const extraNote = {
      ...inSync(aventus),
      notes: [...inSync(aventus).notes, { slug: "vanilla", layer: "BASE" as const }],
    };
    expect(
      planCatalogue([aventus], new Map([["creed/aventus", extraNote]])).update[0]!.relink,
    ).toBe(true);
  });

  it("sets the photo when one appears, and clears a path whose file is gone", () => {
    const withPhoto = { ...aventus, imagePath: "/catalog/creed-aventus.webp" };
    expect(
      planCatalogue([withPhoto], new Map([["creed/aventus", inSync(aventus)]])).update[0]!.fields,
    ).toEqual({ imagePath: "/catalog/creed-aventus.webp" });
    expect(
      planCatalogue([aventus], new Map([["creed/aventus", inSync(withPhoto)]])).update[0]!.fields,
    ).toEqual({ imagePath: null });
  });
});
