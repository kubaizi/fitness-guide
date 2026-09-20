-- Written by hand rather than generated, for one reason: Prisma's own version
-- of this migration DROPPED the photo table and created a new one, because it
-- cannot tell a rename from a delete-and-recreate. Three rows would have gone
-- with it. A rename keeps them and is what actually happened to the model.

-- CreateEnum
CREATE TYPE "PhotoVisibility" AS ENUM ('private', 'members', 'public');

-- Several weighings a day: the unique pair goes, and the index gains createdAt
-- so same-day rows keep the order they were added in.
DROP INDEX "WeightEntry_userId_measuredOn_idx";
DROP INDEX "WeightEntry_userId_measuredOn_key";
CREATE INDEX "WeightEntry_userId_measuredOn_createdAt_idx" ON "WeightEntry"("userId", "measuredOn", "createdAt");

-- ProgressPhoto becomes Photo. Rename the table, its primary key, its foreign
-- key and its index, so every name matches what Prisma expects from the schema
-- and nothing has to be re-created.
ALTER TABLE "ProgressPhoto" RENAME TO "Photo";
ALTER TABLE "Photo" RENAME CONSTRAINT "ProgressPhoto_pkey" TO "Photo_pkey";
ALTER TABLE "Photo" RENAME CONSTRAINT "ProgressPhoto_userId_fkey" TO "Photo_userId_fkey";
ALTER INDEX "ProgressPhoto_userId_takenOn_idx" RENAME TO "Photo_userId_takenOn_idx";

-- Every existing photo was private, because private was the only thing a
-- photo could be. The default says so; this makes it explicit for old rows.
ALTER TABLE "Photo" ADD COLUMN "visibility" "PhotoVisibility" NOT NULL DEFAULT 'private';

-- CreateIndex
CREATE INDEX "Photo_visibility_createdAt_idx" ON "Photo"("visibility", "createdAt");

-- CreateTable
CREATE TABLE "PhotoLike" (
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoLike_pkey" PRIMARY KEY ("photoId","userId")
);

-- CreateTable
CREATE TABLE "PhotoComment" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "photoId" TEXT,
    "commentId" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoComment_photoId_createdAt_idx" ON "PhotoComment"("photoId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PhotoLike" ADD CONSTRAINT "PhotoLike_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoLike" ADD CONSTRAINT "PhotoLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoComment" ADD CONSTRAINT "PhotoComment_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoComment" ADD CONSTRAINT "PhotoComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PhotoComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
