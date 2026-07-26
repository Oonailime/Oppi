-- Manual study sessions are user activity and remain separate from questions.
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudySession_startedAt_idx" ON "StudySession"("startedAt");
CREATE INDEX "StudySession_endedAt_idx" ON "StudySession"("endedAt");
