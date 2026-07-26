export function calculateTargetSecondsPerQuestion(
  durationMinutes: number,
  totalQuestions: number,
) {
  if (durationMinutes <= 0 || totalQuestions <= 0) {
    throw new Error("Duração e quantidade de questões devem ser positivas.");
  }

  return Math.round((durationMinutes * 60) / totalQuestions);
}

export function calculateTimePerformance(
  targetSecondsPerQuestion: number,
  totalQuestions: number,
  durationSeconds: number,
  questionTimes: number[],
) {
  const timedQuestionCount = questionTimes.filter((seconds) => seconds > 0).length;

  return {
    timingAvailable: durationSeconds === 0 || timedQuestionCount > 0,
    timedQuestionCount,
    fasterQuestionCount: questionTimes.filter(
      (seconds) => seconds > 0 && seconds < targetSecondsPerQuestion,
    ).length,
    timeBalanceSeconds:
      targetSecondsPerQuestion * totalQuestions - durationSeconds,
  };
}
