import { summarizeStudyTime } from "../src/dashboard/dashboard.service";

describe("summarizeStudyTime", () => {
  it("soma questões e cronômetro no dia e no total acumulado", () => {
    const now = new Date("2026-07-26T15:00:00.000Z");
    const result = summarizeStudyTime(
      [
        {
          completedAt: new Date("2026-07-26T12:00:00.000Z"),
          durationSeconds: 1800,
        },
        {
          completedAt: new Date("2026-07-25T12:00:00.000Z"),
          durationSeconds: 3600,
        },
      ],
      [
        {
          startedAt: new Date("2026-07-26T13:00:00.000Z"),
          endedAt: new Date("2026-07-26T13:10:00.000Z"),
        },
        {
          startedAt: new Date("2026-07-26T14:50:00.000Z"),
          endedAt: null,
        },
        {
          startedAt: new Date("2026-07-25T10:00:00.000Z"),
          endedAt: new Date("2026-07-25T10:20:00.000Z"),
        },
      ],
      now,
    );

    expect(result).toMatchObject({
      todaySeconds: 3000,
      totalSeconds: 7800,
      questionTodaySeconds: 1800,
      manualTodaySeconds: 1200,
      manualRunning: true,
      manualStartedAt: new Date("2026-07-26T14:50:00.000Z"),
    });
  });
});
