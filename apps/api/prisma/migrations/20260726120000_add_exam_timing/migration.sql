-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "role" TEXT,
    "defaultDurationMinutes" INTEGER NOT NULL,
    "extendedDurationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- Register the existing question set before adding required relations.
INSERT INTO "Exam" (
    "id",
    "name",
    "organization",
    "year",
    "role",
    "defaultDurationMinutes",
    "extendedDurationMinutes"
) VALUES (
    'dataprev-2024',
    'DATAPREV 2024',
    'DATAPREV',
    2024,
    'Analista de Tecnologia da Informação',
    240,
    300
);

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "examId" TEXT;
ALTER TABLE "Question" ADD COLUMN "number" INTEGER;
UPDATE "Question"
SET "examId" = 'dataprev-2024', "number" = "id";
ALTER TABLE "Question" ALTER COLUMN "examId" SET NOT NULL;
ALTER TABLE "Question" ALTER COLUMN "number" SET NOT NULL;

-- Future exams may reuse question numbers, so the internal id becomes generated.
CREATE SEQUENCE "Question_id_seq";
SELECT setval(
    '"Question_id_seq"',
    GREATEST(COALESCE((SELECT MAX("id") FROM "Question"), 0), 1)
);
ALTER SEQUENCE "Question_id_seq" OWNED BY "Question"."id";
ALTER TABLE "Question"
ALTER COLUMN "id" SET DEFAULT nextval('"Question_id_seq"');

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN "examId" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "timeLimitSeconds" INTEGER;
ALTER TABLE "Attempt" ADD COLUMN "targetSecondsPerQuestion" INTEGER;
UPDATE "Attempt"
SET
    "examId" = 'dataprev-2024',
    "timeLimitSeconds" = 14400,
    "targetSecondsPerQuestion" = 206;
ALTER TABLE "Attempt" ALTER COLUMN "examId" SET NOT NULL;
ALTER TABLE "Attempt" ALTER COLUMN "timeLimitSeconds" SET NOT NULL;
ALTER TABLE "Attempt" ALTER COLUMN "targetSecondsPerQuestion" SET NOT NULL;

-- AlterTable
ALTER TABLE "AttemptAnswer"
ADD COLUMN "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Exam_year_idx" ON "Exam"("year");
CREATE UNIQUE INDEX "Question_examId_number_key" ON "Question"("examId", "number");
CREATE INDEX "Question_examId_discipline_idx" ON "Question"("examId", "discipline");
CREATE INDEX "Attempt_examId_idx" ON "Attempt"("examId");

-- AddForeignKey
ALTER TABLE "Question"
ADD CONSTRAINT "Question_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt"
ADD CONSTRAINT "Attempt_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
