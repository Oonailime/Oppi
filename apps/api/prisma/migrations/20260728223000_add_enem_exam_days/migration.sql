ALTER TABLE "Question" ADD COLUMN "examDay" INTEGER;
ALTER TABLE "Attempt" ADD COLUMN "examDay" INTEGER;

UPDATE "Question"
SET "examDay" = CASE WHEN "number" <= 90 THEN 1 ELSE 2 END
WHERE "examId" LIKE 'enem-%';

CREATE INDEX "Question_examId_examDay_idx" ON "Question"("examId", "examDay");
