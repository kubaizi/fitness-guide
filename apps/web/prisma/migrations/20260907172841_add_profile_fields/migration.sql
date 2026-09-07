-- AlterTable
ALTER TABLE "User" ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "snapchat" TEXT,
ADD COLUMN     "tiktok" TEXT,
ADD COLUMN     "x" TEXT;

-- CreateTable
CREATE TABLE "WeightEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "measuredOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeightEntry_userId_measuredOn_idx" ON "WeightEntry"("userId", "measuredOn");

-- CreateIndex
CREATE UNIQUE INDEX "WeightEntry_userId_measuredOn_key" ON "WeightEntry"("userId", "measuredOn");

-- AddForeignKey
ALTER TABLE "WeightEntry" ADD CONSTRAINT "WeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
