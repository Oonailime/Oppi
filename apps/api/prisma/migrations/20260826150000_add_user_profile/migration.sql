ALTER TABLE "User"
    ADD COLUMN "birthDate" DATE,
    ADD COLUMN "cpf" TEXT,
    ADD COLUMN "profileCompletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- Legacy password accounts already have their established profile identity.
-- Google accounts complete these fields on their next authenticated access.
UPDATE "User"
SET "profileCompletedAt" = CURRENT_TIMESTAMP
WHERE "googleSubject" IS NULL;
