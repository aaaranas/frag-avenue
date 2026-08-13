-- CreateEnum
CREATE TYPE "Concentration" AS ENUM ('PARFUM', 'EDP', 'EDT', 'EDC', 'COLOGNE', 'EXTRAIT', 'OTHER');

-- CreateEnum
CREATE TYPE "GenderClass" AS ENUM ('MASCULINE', 'FEMININE', 'UNISEX');

-- CreateEnum
CREATE TYPE "NoteLayer" AS ENUM ('TOP', 'MIDDLE', 'BASE');

-- CreateEnum
CREATE TYPE "BottleCondition" AS ENUM ('NEW', 'USED', 'DECANT');

-- CreateEnum
CREATE TYPE "Occasion" AS ENUM ('WORK', 'CASUAL', 'EVENING', 'FORMAL', 'SPORT', 'DATE', 'OTHER');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('INDOOR', 'OUTDOOR', 'MIXED');

-- CreateEnum
CREATE TYPE "WeatherSource" AS ENUM ('AUTO', 'MANUAL', 'NONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fragrance" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "concentration" "Concentration" NOT NULL DEFAULT 'EDP',
    "releaseYear" INTEGER,
    "perfumer" TEXT,
    "gender" "GenderClass" NOT NULL DEFAULT 'UNISEX',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fragrance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceNote" (
    "fragranceId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "layer" "NoteLayer" NOT NULL,

    CONSTRAINT "FragranceNote_pkey" PRIMARY KEY ("fragranceId","noteId","layer")
);

-- CreateTable
CREATE TABLE "Accord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Accord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceAccord" (
    "fragranceId" TEXT NOT NULL,
    "accordId" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "FragranceAccord_pkey" PRIMARY KEY ("fragranceId","accordId")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "bottleSizeMl" INTEGER NOT NULL,
    "remainingMl" INTEGER,
    "purchasePriceMinor" INTEGER,
    "currency" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseSource" TEXT,
    "batchCode" TEXT,
    "condition" "BottleCondition" NOT NULL DEFAULT 'NEW',
    "personalRating" INTEGER,
    "personalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WearLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "collectionItemId" TEXT,
    "wornAt" TIMESTAMP(3) NOT NULL,
    "sprays" INTEGER NOT NULL,
    "occasion" "Occasion" NOT NULL DEFAULT 'CASUAL',
    "environment" "Environment" NOT NULL DEFAULT 'MIXED',
    "temperatureC" DOUBLE PRECISION,
    "humidityPct" INTEGER,
    "weatherCondition" TEXT,
    "weatherSource" "WeatherSource" NOT NULL DEFAULT 'NONE',
    "longevityHours" DOUBLE PRECISION,
    "projection" INTEGER,
    "enjoyment" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WearLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Fragrance_brandId_idx" ON "Fragrance"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Fragrance_brandId_slug_key" ON "Fragrance"("brandId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Note_name_key" ON "Note"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Note_slug_key" ON "Note"("slug");

-- CreateIndex
CREATE INDEX "FragranceNote_noteId_idx" ON "FragranceNote"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "Accord_name_key" ON "Accord"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Accord_slug_key" ON "Accord"("slug");

-- CreateIndex
CREATE INDEX "FragranceAccord_accordId_idx" ON "FragranceAccord"("accordId");

-- CreateIndex
CREATE INDEX "CollectionItem_userId_idx" ON "CollectionItem"("userId");

-- CreateIndex
CREATE INDEX "CollectionItem_userId_fragranceId_idx" ON "CollectionItem"("userId", "fragranceId");

-- CreateIndex
CREATE INDEX "WearLog_userId_wornAt_idx" ON "WearLog"("userId", "wornAt");

-- CreateIndex
CREATE INDEX "WearLog_userId_fragranceId_idx" ON "WearLog"("userId", "fragranceId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fragrance" ADD CONSTRAINT "Fragrance_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceNote" ADD CONSTRAINT "FragranceNote_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceNote" ADD CONSTRAINT "FragranceNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceAccord" ADD CONSTRAINT "FragranceAccord_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceAccord" ADD CONSTRAINT "FragranceAccord_accordId_fkey" FOREIGN KEY ("accordId") REFERENCES "Accord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearLog" ADD CONSTRAINT "WearLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearLog" ADD CONSTRAINT "WearLog_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearLog" ADD CONSTRAINT "WearLog_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
