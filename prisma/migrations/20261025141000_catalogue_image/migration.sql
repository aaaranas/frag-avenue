-- Catalogue photos (refactor Phase 3). Additive, nullable: fragrances without a
-- photo keep rendering the outline glyph.
ALTER TABLE "Fragrance" ADD COLUMN "imagePath" VARCHAR(200);

-- Only site-relative paths under /catalog/ — never an external URL.
ALTER TABLE "Fragrance" ADD CONSTRAINT "Fragrance_imagePath_check" CHECK ("imagePath" IS NULL OR "imagePath" ~ '^/catalog/[a-z0-9-]+\.(jpg|jpeg|png|webp)$');
