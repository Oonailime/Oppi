import { calculateAttemptScore } from "../src/questions/scoring";
import {
  calculateTargetSecondsPerQuestion,
  calculateTimePerformance,
} from "../src/questions/timing";

describe("calculateAttemptScore", () => {
  it("aplica os pesos de conhecimentos gerais e específicos", () => {
    const score = calculateAttemptScore(
      [
        { id: 1, weight: 1, correctAnswer: "A", annulled: false },
        { id: 41, weight: 2.5, correctAnswer: "C", annulled: false },
      ],
      new Map([
        [1, "A"],
        [41, "B"],
      ]),
    );

    expect(score.correctAnswers).toBe(1);
    expect(score.weightedScore).toBe(1);
    expect(score.maxWeightedScore).toBe(3.5);
    expect(score.rawPercentage).toBe(50);
  });

  it("concede a pontuação oficial de anuladas sem contaminar a precisão real", () => {
    const score = calculateAttemptScore(
      [
        { id: 13, weight: 1, correctAnswer: null, annulled: true },
        { id: 14, weight: 1, correctAnswer: "B", annulled: false },
      ],
      new Map([[14, "B"]]),
    );

    expect(score.annulledQuestions).toBe(1);
    expect(score.correctAnswers).toBe(1);
    expect(score.weightedScore).toBe(2);
    expect(score.rawPercentage).toBe(100);
    expect(score.weightedPercentage).toBe(100);
  });

  it("mantém respostas em branco como erro nas questões válidas", () => {
    const score = calculateAttemptScore(
      [{ id: 7, weight: 1, correctAnswer: "C", annulled: false }],
      new Map(),
    );

    expect(score.answeredQuestions).toBe(0);
    expect(score.correctAnswers).toBe(0);
    expect(score.weightedScore).toBe(0);
  });
});

describe("calculateTargetSecondsPerQuestion", () => {
  it("calcula a média após reservar 30 minutos para o gabarito", () => {
    expect(calculateTargetSecondsPerQuestion(210, 70)).toBe(180);
  });

  it("inclui a hora adicional na modalidade de 5 horas", () => {
    expect(calculateTargetSecondsPerQuestion(270, 70)).toBe(231);
  });
});

describe("calculateTimePerformance", () => {
  it("contabiliza questões rápidas e o saldo líquido do simulado", () => {
    expect(calculateTimePerformance(180, 2, 420, [60, 360])).toEqual({
      timingAvailable: true,
      timedQuestionCount: 2,
      fasterQuestionCount: 1,
      timeBalanceSeconds: -60,
    });
  });

  it("preserva o saldo total sem fingir tempos legados por questão", () => {
    expect(calculateTimePerformance(180, 2, 420, [0, 0])).toEqual({
      timingAvailable: false,
      timedQuestionCount: 0,
      fasterQuestionCount: 0,
      timeBalanceSeconds: -60,
    });
  });
});
