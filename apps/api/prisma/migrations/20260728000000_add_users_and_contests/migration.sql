-- Create the user, session and contest ownership structure.
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContestStudyTopic" (
    "contestId" TEXT NOT NULL,
    "studyTopicId" INTEGER NOT NULL,
    "status" "StudyStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "questionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ContestStudyTopic_pkey" PRIMARY KEY ("contestId","studyTopicId")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX "Contest_userId_idx" ON "Contest"("userId");
CREATE INDEX "Contest_targetDate_idx" ON "Contest"("targetDate");
CREATE INDEX "ContestStudyTopic_contestId_status_idx" ON "ContestStudyTopic"("contestId", "status");
CREATE INDEX "ContestStudyTopic_studyTopicId_idx" ON "ContestStudyTopic"("studyTopicId");

ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestStudyTopic" ADD CONSTRAINT "ContestStudyTopic_contestId_fkey"
    FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestStudyTopic" ADD CONSTRAINT "ContestStudyTopic_studyTopicId_fkey"
    FOREIGN KEY ("studyTopicId") REFERENCES "StudyTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The fixed identifiers let the seed and the data migration agree on the owner
-- of every record that existed before accounts were introduced.
INSERT INTO "User" ("id", "username", "displayName", "passwordHash")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Emiliano',
    'Emiliano',
    'pbkdf2$120000$88af33068dc0dff9af17339d15ee1f01$5ab4a83758e4e4469d19c423d039538a82d6228f11bf396ff5a7f6db8fdd8e8bf4992de3f13e2503aa0f5d62e85ca9ebeca8628044d9b7e663f43a2335a517b4'
);

INSERT INTO "Contest" ("id", "userId", "name", "targetDate")
VALUES (
    'dataprev-2026-emiliano',
    '00000000-0000-0000-0000-000000000001',
    'DATAPREV 2026',
    DATE '2026-11-10'
);

-- Preserve all current plan progress before moving it out of the shared catalog.
INSERT INTO "ContestStudyTopic" (
    "contestId",
    "studyTopicId",
    "status",
    "progress",
    "questionsCompleted",
    "correctAnswers",
    "startedAt",
    "completedAt",
    "notes"
)
SELECT
    'dataprev-2026-emiliano',
    "id",
    "status",
    "progress",
    "questionsCompleted",
    "correctAnswers",
    "startedAt",
    "completedAt",
    "notes"
FROM "StudyTopic";

ALTER TABLE "Attempt" ADD COLUMN "contestId" TEXT;
UPDATE "Attempt" SET "contestId" = 'dataprev-2026-emiliano';
ALTER TABLE "Attempt" ALTER COLUMN "contestId" SET NOT NULL;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_contestId_fkey"
    FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Attempt_contestId_idx" ON "Attempt"("contestId");
CREATE INDEX "Attempt_contestId_completedAt_idx" ON "Attempt"("contestId", "completedAt");

ALTER TABLE "StudySession" ADD COLUMN "contestId" TEXT;
UPDATE "StudySession" SET "contestId" = 'dataprev-2026-emiliano';
ALTER TABLE "StudySession" ALTER COLUMN "contestId" SET NOT NULL;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_contestId_fkey"
    FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "StudySession_contestId_idx" ON "StudySession"("contestId");
CREATE INDEX "StudySession_contestId_endedAt_idx" ON "StudySession"("contestId", "endedAt");

DROP INDEX "StudyTopic_status_idx";
ALTER TABLE "StudyTopic"
    DROP COLUMN "status",
    DROP COLUMN "progress",
    DROP COLUMN "questionsCompleted",
    DROP COLUMN "correctAnswers",
    DROP COLUMN "startedAt",
    DROP COLUMN "completedAt",
    DROP COLUMN "notes";
