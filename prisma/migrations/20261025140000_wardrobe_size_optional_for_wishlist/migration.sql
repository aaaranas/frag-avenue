-- Wardrobe (refactor Phase 3): wishlist entries may omit a bottle size.
--
-- Relaxes a constraint only; every existing row keeps its value. The app still
-- requires a size for BOTTLE, DECANT, and SAMPLE items.
ALTER TABLE "CollectionItem" ALTER COLUMN "bottleSizeMl" DROP NOT NULL;

-- Sizes are positive when present (the app already enforced 1..2000).
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_bottleSizeMl_check" CHECK ("bottleSizeMl" IS NULL OR "bottleSizeMl" > 0);
