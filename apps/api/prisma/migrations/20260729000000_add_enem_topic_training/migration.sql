ALTER TABLE "StudyTopic"
ADD COLUMN "topicCode" TEXT,
ADD COLUMN "topicTitle" TEXT,
ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "competencyCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "skillCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Attempt"
ADD COLUMN "trainingTopicId" INTEGER,
ADD COLUMN "includeCorrectAnswers" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "StudyTopic_topicCode_idx" ON "StudyTopic"("topicCode");
CREATE INDEX "StudyTopic_isGroup_idx" ON "StudyTopic"("isGroup");
CREATE INDEX "Attempt_trainingTopicId_idx" ON "Attempt"("trainingTopicId");

ALTER TABLE "Attempt"
ADD CONSTRAINT "Attempt_trainingTopicId_fkey"
FOREIGN KEY ("trainingTopicId") REFERENCES "StudyTopic"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
