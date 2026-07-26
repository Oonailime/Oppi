-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('FULL', 'DISCIPLINE');

-- CreateTable
CREATE TABLE "StudyTopic" (
    "id" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "syllabusItem" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "detail" TEXT,
    "page" TEXT NOT NULL,
    "suggestedPriority" TEXT NOT NULL,
    "status" "StudyStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "questionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "StudyTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" INTEGER NOT NULL,
    "discipline" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "weight" DECIMAL(3,1) NOT NULL,
    "sourcePage" INTEGER NOT NULL,
    "sourceImage" TEXT NOT NULL,
    "contextImage" TEXT,
    "correctAnswer" TEXT,
    "annulled" BOOLEAN NOT NULL DEFAULT false,
    "studyTopicId" INTEGER,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "mode" "AttemptMode" NOT NULL,
    "discipline" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "totalQuestions" INTEGER NOT NULL,
    "answeredQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "annulledQuestions" INTEGER NOT NULL DEFAULT 0,
    "rawPercentage" DECIMAL(5,2),
    "weightedScore" DECIMAL(6,2),
    "maxWeightedScore" DECIMAL(6,2),
    "weightedPercentage" DECIMAL(5,2),

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "selectedAnswer" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "awardedPoints" DECIMAL(3,1) NOT NULL,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyTopic_discipline_idx" ON "StudyTopic"("discipline");

-- CreateIndex
CREATE INDEX "StudyTopic_status_idx" ON "StudyTopic"("status");

-- CreateIndex
CREATE INDEX "Question_discipline_idx" ON "Question"("discipline");

-- CreateIndex
CREATE INDEX "Question_studyTopicId_idx" ON "Question"("studyTopicId");

-- CreateIndex
CREATE INDEX "Attempt_completedAt_idx" ON "Attempt"("completedAt");

-- CreateIndex
CREATE INDEX "Attempt_discipline_idx" ON "Attempt"("discipline");

-- CreateIndex
CREATE INDEX "AttemptAnswer_questionId_idx" ON "AttemptAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAnswer_attemptId_questionId_key" ON "AttemptAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_studyTopicId_fkey" FOREIGN KEY ("studyTopicId") REFERENCES "StudyTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
