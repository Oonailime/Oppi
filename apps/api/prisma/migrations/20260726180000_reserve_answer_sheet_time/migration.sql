-- Reserve the final 30 minutes of every exam for filling in the answer sheet.
UPDATE "Exam"
SET
    "defaultDurationMinutes" = GREATEST("defaultDurationMinutes" - 30, 1),
    "extendedDurationMinutes" = GREATEST("extendedDurationMinutes" - 30, 1);

-- Attempts keep timing snapshots, so update existing results to the new pace too.
UPDATE "Attempt" AS attempt
SET
    "timeLimitSeconds" = GREATEST(attempt."timeLimitSeconds" - 1800, 60),
    "targetSecondsPerQuestion" = GREATEST(
        ROUND(
            GREATEST(attempt."timeLimitSeconds" - 1800, 60)::NUMERIC /
            question_count.total
        )::INTEGER,
        1
    )
FROM (
    SELECT "examId", COUNT(*) AS total
    FROM "Question"
    GROUP BY "examId"
) AS question_count
WHERE
    question_count."examId" = attempt."examId"
    AND question_count.total > 0;
