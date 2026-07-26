-- These questions are self-contained. The full-page context looked truncated
-- and duplicated unrelated content before the actual question image.
UPDATE "Question"
SET "contextImage" = NULL
WHERE "examId" = 'bacen-2024' AND "number" IN (87, 94, 95);
