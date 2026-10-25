-- Catalogue: Rasasi Rayhaan Elixir, with its photo, so production has it
-- without a reseed. Data only, no schema change.
--
-- Same (brand slug, fragrance slug) the seed uses, so `pnpm db:seed` later
-- updates this row instead of duplicating it. Idempotent: the brand and the
-- fragrance are only inserted when missing. Concentration, year, notes, and
-- accords are unknown for now (OTHER / NULL / none).
INSERT INTO "Brand" ("id", "name", "slug")
VALUES ('brand_rasasi', 'Rasasi', 'rasasi')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Fragrance" ("id", "brandId", "name", "slug", "concentration", "imagePath", "status", "updatedAt")
SELECT 'fragrance_rasasi_rayhaan_elixir', b."id", 'Rayhaan Elixir', 'rayhaan-elixir', 'OTHER',
       '/catalog/rasasi-rayhaan-elixir.webp', 'APPROVED', CURRENT_TIMESTAMP
FROM "Brand" b
WHERE b."slug" = 'rasasi'
ON CONFLICT ("brandId", "slug") DO NOTHING;
