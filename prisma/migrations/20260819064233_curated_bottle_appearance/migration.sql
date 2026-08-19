-- CreateEnum
CREATE TYPE "BottleShape" AS ENUM ('RECTANGULAR', 'FLASK', 'CYLINDRICAL', 'TAPERED', 'SQUAT');

-- CreateEnum
CREATE TYPE "GlassFinish" AS ENUM ('CLEAR', 'FROSTED', 'OPAQUE');

-- AlterTable
ALTER TABLE "Fragrance" ADD COLUMN     "bottleShape" "BottleShape",
ADD COLUMN     "capColor" VARCHAR(7),
ADD COLUMN     "glassColor" VARCHAR(7),
ADD COLUMN     "glassFinish" "GlassFinish";
