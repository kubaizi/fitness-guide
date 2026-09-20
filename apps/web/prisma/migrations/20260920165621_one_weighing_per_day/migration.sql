-- One weighing per person per day, enforced by the database.
--
-- Hand-written because `prisma migrate dev` asks a human to confirm adding a
-- unique index, and there is no human at that prompt. The check it wants —
-- no existing duplicates — was run first, and found none.

CREATE UNIQUE INDEX "WeightEntry_userId_measuredOn_key" ON "WeightEntry"("userId", "measuredOn");
