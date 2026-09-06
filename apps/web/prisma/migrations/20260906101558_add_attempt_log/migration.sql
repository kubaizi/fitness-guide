-- CreateTable
CREATE TABLE "AttemptLog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttemptLog_kind_key_createdAt_idx" ON "AttemptLog"("kind", "key", "createdAt");
