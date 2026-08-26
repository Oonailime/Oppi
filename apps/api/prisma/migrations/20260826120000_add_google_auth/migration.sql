-- Allow Google-only accounts while preserving the temporary password login.
ALTER TABLE "User"
    ALTER COLUMN "passwordHash" DROP NOT NULL,
    ADD COLUMN "email" TEXT,
    ADD COLUMN "googleSubject" TEXT,
    ADD COLUMN "avatarUrl" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");
