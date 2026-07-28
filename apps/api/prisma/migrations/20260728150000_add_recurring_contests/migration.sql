-- Recurring contests and their language-aware, persisted question sets.
CREATE TYPE "ContestType" AS ENUM ('STANDARD', 'RECURRING');
CREATE TYPE "ForeignLanguage" AS ENUM ('ENGLISH', 'SPANISH');
ALTER TYPE "AttemptMode" ADD VALUE 'ALL_YEARS';

ALTER TABLE "Contest"
ADD COLUMN "type" "ContestType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "systemManaged" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Contest"
SET "systemManaged" = true
WHERE "id" = 'dataprev-2026-emiliano';

ALTER TABLE "Exam"
ADD COLUMN "systemManaged" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "ContestExam" (
    "contestId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,

    CONSTRAINT "ContestExam_pkey" PRIMARY KEY ("contestId", "examId")
);

CREATE INDEX "ContestExam_examId_idx" ON "ContestExam"("examId");

ALTER TABLE "ContestExam"
ADD CONSTRAINT "ContestExam_contestId_fkey"
FOREIGN KEY ("contestId") REFERENCES "Contest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContestExam"
ADD CONSTRAINT "ContestExam_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Every exam that existed before this feature belongs to the original
-- developer-created DATAPREV contest.
INSERT INTO "ContestExam" ("contestId", "examId")
SELECT 'dataprev-2026-emiliano', "id"
FROM "Exam"
ON CONFLICT DO NOTHING;

ALTER TABLE "Question"
ADD COLUMN "variant" TEXT NOT NULL DEFAULT '';

DROP INDEX "Question_examId_number_key";
CREATE UNIQUE INDEX "Question_examId_number_variant_key"
ON "Question"("examId", "number", "variant");

ALTER TABLE "Attempt"
ADD COLUMN "foreignLanguage" "ForeignLanguage";

ALTER TABLE "Attempt"
ALTER COLUMN "examId" DROP NOT NULL;

CREATE TABLE "AttemptQuestion" (
    "attemptId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AttemptQuestion_pkey" PRIMARY KEY ("attemptId", "questionId")
);

CREATE UNIQUE INDEX "AttemptQuestion_attemptId_position_key"
ON "AttemptQuestion"("attemptId", "position");
CREATE INDEX "AttemptQuestion_questionId_idx"
ON "AttemptQuestion"("questionId");

ALTER TABLE "AttemptQuestion"
ADD CONSTRAINT "AttemptQuestion_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttemptQuestion"
ADD CONSTRAINT "AttemptQuestion_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Completed attempts already have one AttemptAnswer row for every question
-- shown, including unanswered questions.
INSERT INTO "AttemptQuestion" ("attemptId", "questionId", "position")
SELECT
    answer."attemptId",
    answer."questionId",
    ROW_NUMBER() OVER (
        PARTITION BY answer."attemptId"
        ORDER BY question."number", question."id"
    )::INTEGER
FROM "AttemptAnswer" answer
JOIN "Question" question ON question."id" = answer."questionId"
ON CONFLICT DO NOTHING;

-- Preserve resumability for attempts that have not been submitted yet.
INSERT INTO "AttemptQuestion" ("attemptId", "questionId", "position")
SELECT
    attempt."id",
    question."id",
    ROW_NUMBER() OVER (
        PARTITION BY attempt."id"
        ORDER BY question."number", question."id"
    )::INTEGER
FROM "Attempt" attempt
JOIN "Question" question ON question."examId" = attempt."examId"
WHERE attempt."completedAt" IS NULL
  AND (
      attempt."mode" <> 'DISCIPLINE'
      OR question."discipline" = attempt."discipline"
  )
ON CONFLICT DO NOTHING;
