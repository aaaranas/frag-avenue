-- Clubs & challenges (refactor Phase 7): the two global challenges.
--
-- Data only, no schema change. Idempotent (ON CONFLICT on the unique slug), so
-- it is safe whether or not a seed already created them. Progress is derived
-- from wears in a rolling `windowDays` window, so nothing else is needed.
INSERT INTO "Challenge" ("id", "slug", "title", "description", "kind", "target", "windowDays", "clubId", "createdAt")
VALUES
  ('challenge_30_scents_30_days', '30-scents-30-days', '30 different scents in 30 days',
   'Wear 30 different fragrances within any 30 days.', 'UNIQUE_FRAGRANCES', 30, 30, NULL, CURRENT_TIMESTAMP),
  ('challenge_5_houses_30_days', '5-houses-30-days', '5 different houses in 30 days',
   'Wear fragrances from 5 different houses within any 30 days.', 'UNIQUE_HOUSES', 5, 30, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
