-- Catalogue photos now ship as transparent WebP cutouts (background removed by
-- `pnpm catalog:image`), replacing the JPEGs with a white box around them.
--
-- Data only, no schema change: repoints rows still on an old JPEG path, so
-- production follows without a reseed. Idempotent; rows already on .webp, or
-- with no photo, are untouched. The old .jpg files are removed in the same
-- release, so the previous build shows the glyph fallback until the new one
-- takes traffic.
UPDATE "Fragrance"
SET "imagePath" = '/catalog/rasasi-hawas-ice.webp'
WHERE "imagePath" = '/catalog/rasasi-hawas-ice.jpg';
