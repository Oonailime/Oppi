-- User-created contests keep their source documents and declared study area isolated.
CREATE TYPE "ContestDocumentKind" AS ENUM (
    'PREVIOUS_EXAM',
    'ANSWER_KEY',
    'NOTICE'
);

ALTER TABLE "Contest"
ADD COLUMN "desiredArea" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "storageDirectory" TEXT;

CREATE TABLE "ContestDocument" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "kind" "ContestDocumentKind" NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContestDocument_contestId_kind_key"
ON "ContestDocument"("contestId", "kind");

CREATE INDEX "ContestDocument_contestId_idx"
ON "ContestDocument"("contestId");

ALTER TABLE "ContestDocument"
ADD CONSTRAINT "ContestDocument_contestId_fkey"
FOREIGN KEY ("contestId") REFERENCES "Contest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
