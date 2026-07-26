-- Store the alternatives shown by each exam board.
ALTER TABLE "Exam"
ADD COLUMN "answerOptions" TEXT[] NOT NULL
DEFAULT ARRAY['A', 'B', 'C', 'D', 'E']::TEXT[];
