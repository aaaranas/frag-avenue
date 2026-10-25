import { describe, it, expect } from "vitest";
import {
  appendCatalogueRows,
  nameFromPhotoFile,
  parseCatalogue,
  parseCsv,
  toCsvRow,
} from "./catalogue-csv";

const HEADER =
  "house,fragrance,concentration,year,gender,perfumer,top notes,heart notes,base notes,accords";

describe("parseCsv", () => {
  it("handles quotes, embedded commas and newlines, escaped quotes, CRLF, and a BOM", () => {
    const text = '﻿a,b\r\n"x, y","say ""hi"""\r\n"multi\nline",z\n';
    expect(parseCsv(text)).toEqual([
      { line: 1, cells: ["a", "b"] },
      { line: 2, cells: ["x, y", 'say "hi"'] },
      { line: 3, cells: ["multi\nline", "z"] },
    ]);
  });

  it("keeps empty fields and reads a last line without a newline", () => {
    expect(parseCsv("a,,c\nd,e,")).toEqual([
      { line: 1, cells: ["a", "", "c"] },
      { line: 2, cells: ["d", "e", ""] },
    ]);
  });

  it("refuses an unclosed quote", () => {
    expect(() => parseCsv('a,"b\nc')).toThrow(/never closed/);
  });

  it("round-trips through toCsvRow", () => {
    const cells = ["Maison Francis Kurkdjian", "Baccarat Rouge 540", 'a "quoted", note', ""];
    expect(parseCsv(toCsvRow(cells))[0]!.cells).toEqual(cells);
  });
});

describe("parseCatalogue", () => {
  it("reads a full row", () => {
    const { entries, errors } = parseCatalogue(
      `${HEADER}\nCreed,Aventus,EDP,2010,masculine,Erwin Creed,pineapple; bergamot,birch,musk; vanilla,fruity:5; smoky:4\n`,
    );
    expect(errors).toEqual([]);
    expect(entries).toEqual([
      {
        line: 2,
        house: "Creed",
        houseSlug: "creed",
        name: "Aventus",
        slug: "aventus",
        concentration: "EDP",
        releaseYear: 2010,
        gender: "MASCULINE",
        perfumer: "Erwin Creed",
        notes: { top: ["pineapple", "bergamot"], heart: ["birch"], base: ["musk", "vanilla"] },
        accords: [
          { name: "fruity", strength: 5 },
          { name: "smoky", strength: 4 },
        ],
      },
    ]);
  });

  it("needs only house and fragrance, in any order and case, and fills the rest with defaults", () => {
    const { entries, errors } = parseCatalogue("Fragrance, BRAND\nRayhaan Elixir,Rasasi\n");
    expect(errors).toEqual([]);
    expect(entries[0]).toMatchObject({
      house: "Rasasi",
      name: "Rayhaan Elixir",
      concentration: "OTHER",
      releaseYear: null,
      gender: "UNISEX",
      perfumer: null,
      notes: { top: [], heart: [], base: [] },
      accords: [],
    });
  });

  it("accepts the long names for concentration and gender", () => {
    const { entries } = parseCatalogue(
      "house,fragrance,concentration,gender\nA,One,Eau de Toilette,women\nA,Two,extrait de parfum,M\n",
    );
    expect(entries.map((e) => [e.concentration, e.gender])).toEqual([
      ["EDT", "FEMININE"],
      ["EXTRAIT", "MASCULINE"],
    ]);
  });

  it("treats a bare accord as strength 3 and de-duplicates notes and accords", () => {
    const { entries } = parseCatalogue(
      "house,fragrance,top notes,accords\nA,B,Bergamot; bergamot ; lemon;,woody; Woody:5; fresh:2\n",
    );
    expect(entries[0]!.notes.top).toEqual(["Bergamot", "lemon"]);
    expect(entries[0]!.accords).toEqual([
      { name: "woody", strength: 3 },
      { name: "fresh", strength: 2 },
    ]);
  });

  it("skips blank rows, including ones a spreadsheet leaves as bare commas", () => {
    const { entries, errors } = parseCatalogue("house,fragrance,\n,,\n\nA,B,\n");
    expect(errors).toEqual([]);
    expect(entries.map((e) => e.line)).toEqual([4]);
  });

  it("reports every bad row with its line, and keeps the good ones", () => {
    const { entries, errors } = parseCatalogue(
      [
        "house,fragrance,concentration,year,gender,accords",
        "A,Good,EDP,2001,unisex,woody:4",
        ",No house,EDP,,,",
        "B,Bad bits,Elixir,201,robot,woody:9",
        "A,good,EDT,,,",
      ].join("\n"),
    );
    expect(entries.map((e) => e.name)).toEqual(["Good"]);
    expect(errors).toEqual([
      "Line 3: the house is missing.",
      'Line 4: concentration "Elixir" isn\'t one of EDP, EDT, EDC, Parfum, Extrait, Cologne, Other.',
      'Line 4: gender "robot" isn\'t masculine, feminine, or unisex.',
      'Line 4: year "201" isn\'t a year like 2015.',
      'Line 4: accord "woody:9" needs a strength from 1 to 5, like "woody:4".',
      "Line 5: A good is already on line 2.",
    ]);
  });

  it("refuses unknown or missing columns before reading rows", () => {
    expect(parseCatalogue("house,fragrance,acords\nA,B,woody\n").errors).toEqual([
      'Line 1: unknown column "acords". Use: house, fragrance, concentration, year, gender, perfumer, top notes, heart notes, base notes, accords.',
    ]);
    expect(parseCatalogue("house,year\nA,2001\n").errors).toEqual([
      'Line 1: missing the "fragrance" column.',
    ]);
    expect(parseCatalogue("").errors).toEqual(["The file is empty: add a header row."]);
  });

  it("does not treat inherited object keys as aliases", () => {
    const { errors } = parseCatalogue("house,fragrance,concentration\nA,B,constructor\n");
    expect(errors).toHaveLength(1);
  });
});

describe("nameFromPhotoFile", () => {
  it("splits on the first spaced dash, any dash kind", () => {
    expect(nameFromPhotoFile("Rasasi - Hawas Ice.jpg")).toEqual({
      house: "Rasasi",
      fragrance: "Hawas Ice",
    });
    expect(nameFromPhotoFile("Dior – Sauvage - Elixir.png")).toEqual({
      house: "Dior",
      fragrance: "Sauvage - Elixir",
    });
  });

  it("is null without a house and a name", () => {
    expect(nameFromPhotoFile("IMG_2041.jpg")).toBeNull();
    expect(nameFromPhotoFile("Ex-Nihilo.jpg")).toBeNull();
    expect(nameFromPhotoFile(" - .jpg")).toBeNull();
  });
});

describe("appendCatalogueRows", () => {
  const csv = "fragrance,house,year\nHawas Ice,Rasasi,2022\n";

  it("adds missing rows in the file's column order and keeps existing rows as they are", () => {
    const { text, added } = appendCatalogueRows(csv, [
      { house: "Rasasi", fragrance: "hawas ice" },
      { house: "Rasasi", fragrance: "Rayhaan Elixir" },
      { house: "Rasasi", fragrance: "Rayhaan Elixir" },
    ]);
    expect(added).toEqual([{ house: "Rasasi", fragrance: "Rayhaan Elixir" }]);
    expect(text).toBe("fragrance,house,year\nHawas Ice,Rasasi,2022\nRayhaan Elixir,Rasasi,\n");
    expect(parseCatalogue(text).errors).toEqual([]);
  });

  it("quotes names with commas and copes with a missing final newline", () => {
    const { text } = appendCatalogueRows("house,fragrance", [{ house: "A, B", fragrance: "C" }]);
    expect(text).toBe('house,fragrance\n"A, B",C\n');
  });

  it("returns the text untouched when nothing is new", () => {
    expect(appendCatalogueRows(csv, [{ house: "rasasi", fragrance: "Hawas Ice" }])).toEqual({
      text: csv,
      added: [],
    });
  });
});
