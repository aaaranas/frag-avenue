-- Wear-log platform foundation (refactor Phase 1).
--
-- Expand-only: every statement adds a type, table, column, index, or
-- constraint. Nothing is dropped, renamed, or narrowed, so the previously
-- deployed build keeps working against this schema. The Prisma models
-- CollectionItem/WearLog were renamed to WardrobeItem/Wear with @@map, so the
-- tables keep their names.

-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('BOTTLE', 'DECANT', 'SAMPLE', 'WISHLIST');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('CONFIDENT', 'RELAXED', 'HAPPY', 'COZY', 'FOCUSED', 'ROMANTIC', 'ENERGETIC', 'OTHER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CheckInResult" AS ENUM ('STRONG', 'FAINT', 'GONE');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChallengeKind" AS ENUM ('UNIQUE_FRAGRANCES', 'UNIQUE_HOUSES');

-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "CollectionItem" ADD COLUMN     "kind" "ItemKind" NOT NULL DEFAULT 'BOTTLE';

-- AlterTable
ALTER TABLE "Fragrance" ADD COLUMN     "status" "CatalogStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "submittedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "defaultVisibility" "Visibility" NOT NULL DEFAULT 'FOLLOWERS',
ADD COLUMN     "units" "UnitSystem" NOT NULL DEFAULT 'METRIC',
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "WearLog" ADD COLUMN     "mood" "Mood",
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "weatherObservedAt" TIMESTAMP(3),
ADD COLUMN     "weatherProvider" TEXT;

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "wearId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offsetHours" INTEGER NOT NULL,
    "result" "CheckInResult" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kudos" (
    "wearId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kudos_pkey" PRIMARY KEY ("wearId","userId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "wearId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followeeId")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("clubId","userId")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "ChallengeKind" NOT NULL,
    "target" INTEGER NOT NULL,
    "windowDays" INTEGER NOT NULL DEFAULT 30,
    "clubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckIn_userId_idx" ON "CheckIn"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_wearId_offsetHours_key" ON "CheckIn"("wearId", "offsetHours");

-- CreateIndex
CREATE INDEX "Kudos_userId_idx" ON "Kudos"("userId");

-- CreateIndex
CREATE INDEX "Comment_wearId_createdAt_idx" ON "Comment"("wearId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Follow_followeeId_idx" ON "Follow"("followeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Club_createdById_idx" ON "Club"("createdById");

-- CreateIndex
CREATE INDEX "ClubMembership_userId_idx" ON "ClubMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE INDEX "Challenge_clubId_idx" ON "Challenge"("clubId");

-- CreateIndex
CREATE INDEX "Fragrance_submittedById_idx" ON "Fragrance"("submittedById");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Fragrance" ADD CONSTRAINT "Fragrance_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_wearId_fkey" FOREIGN KEY ("wearId") REFERENCES "WearLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_wearId_fkey" FOREIGN KEY ("wearId") REFERENCES "WearLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_wearId_fkey" FOREIGN KEY ("wearId") REFERENCES "WearLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written: backfills and CHECK constraints (Prisma does not model CHECKs).
-- ---------------------------------------------------------------------------

-- Existing decants become DECANT items; everything else is a BOTTLE (column
-- default). Idempotent.
UPDATE "CollectionItem" SET "kind" = 'DECANT' WHERE "condition" = 'DECANT' AND "kind" = 'BOTTLE';

-- Existing wears: timeZone = 'UTC' and visibility = 'PRIVATE' come from the
-- column defaults above, deliberately.
--   * 'UTC': the old form parsed the typed wall-clock time on a UTC server, so
--     the stored instant's UTC date is the date the user entered.
--   * 'PRIVATE': these wears were logged in a personal journal. They must never
--     appear in anyone else's feed.

-- Check-ins happen at exactly 2h, 4h, or 8h.
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_offsetHours_check" CHECK ("offsetHours" IN (2, 4, 8));

-- No following yourself.
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_not_self_check" CHECK ("followerId" <> "followeeId");

-- Challenge targets and windows are positive.
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_target_check" CHECK ("target" > 0);
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_windowDays_check" CHECK ("windowDays" > 0);
