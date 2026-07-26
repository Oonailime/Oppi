export interface ScoringQuestion {
  id: number;
  weight: number;
  annulled: boolean;
  correctAnswer: string | null;
}

export interface ScoredAnswer {
  questionId: number;
  selectedAnswer: string | null;
  isCorrect: boolean;
  awardedPoints: number;
}

export function calculateAttemptScore(
  questions: ScoringQuestion[],
  answers: ReadonlyMap<number, string | undefined>,
) {
  const scoredAnswers: ScoredAnswer[] = questions.map((question) => {
    const selectedAnswer = answers.get(question.id) ?? null;
    const isCorrect =
      question.annulled || selectedAnswer === question.correctAnswer;
    return {
      questionId: question.id,
      selectedAnswer,
      isCorrect,
      awardedPoints: isCorrect ? question.weight : 0,
    };
  });
  const annulledQuestions = questions.filter(
    (question) => question.annulled,
  ).length;
  const correctAnswers = scoredAnswers.filter((answer) => {
    const question = questions.find(
      (item) => item.id === answer.questionId,
    );
    return answer.isCorrect && !question?.annulled;
  }).length;
  const answeredQuestions = scoredAnswers.filter(
    (answer) => answer.selectedAnswer !== null,
  ).length;
  const weightedScore = scoredAnswers.reduce(
    (total, answer) => total + answer.awardedPoints,
    0,
  );
  const maxWeightedScore = questions.reduce(
    (total, question) => total + question.weight,
    0,
  );
  const evaluatedQuestions = questions.length - annulledQuestions;

  return {
    answers: scoredAnswers,
    annulledQuestions,
    correctAnswers,
    answeredQuestions,
    weightedScore,
    maxWeightedScore,
    rawPercentage:
      evaluatedQuestions === 0
        ? 100
        : (correctAnswers / evaluatedQuestions) * 100,
    weightedPercentage:
      maxWeightedScore === 0 ? 0 : (weightedScore / maxWeightedScore) * 100,
  };
}
