import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  calculateCycleInsights,
  DEFAULT_CYCLE_SETTINGS,
  calculateCycleSummary,
  createPeriodService,
  LocalPeriodRepository
} from "./cycle";
import type { CyclePeriod, DayStatusLog } from "../models/cycle";

const fixedToday = new Date("2026-05-19T08:00:00.000Z");

function makePeriod(overrides: Partial<CyclePeriod> = {}): CyclePeriod {
  return {
    id: "period-1",
    startDate: "2026-05-10",
    startTime: "08:30",
    endDate: "2026-05-14",
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
    ...overrides
  };
}

function makeLog(overrides: Partial<DayStatusLog> = {}): DayStatusLog {
  return {
    id: "log-1",
    date: "2026-05-10",
    periodQuestion: "start",
    periodAnswer: "yes",
    time: "08:30",
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
    ...overrides
  };
}

describe("calculateCycleSummary", () => {
  test("returns an empty-state summary when there are no periods", () => {
    const summary = calculateCycleSummary([], DEFAULT_CYCLE_SETTINGS, fixedToday);

    expect(summary.phase).toBe("unknown");
    expect(summary.currentDay).toBe(0);
    expect(summary.daysUntilNextPeriod).toBeNull();
    expect(summary.nextPeriodDate).toBeNull();
  });

  test("predicts current cycle status from the latest cycle period", () => {
    const summary = calculateCycleSummary([makePeriod()], DEFAULT_CYCLE_SETTINGS, fixedToday);

    expect(summary.phase).toBe("follicular");
    expect(summary.currentDay).toBe(10);
    expect(summary.nextPeriodDate).toBe("2026-06-07");
    expect(summary.daysUntilNextPeriod).toBe(19);
    expect(summary.fertileWindow).toEqual({
      startDate: "2026-05-22",
      endDate: "2026-05-27"
    });
  });
});

describe("calculateCycleInsights", () => {
  test("calculates averages, trend data, and recorded days from current records", () => {
    const insights = calculateCycleInsights(
      [
        makePeriod({ id: "period-3", startDate: "2026-05-08", endDate: "2026-05-12" }),
        makePeriod({ id: "period-2", startDate: "2026-04-10", endDate: "2026-04-15" }),
        makePeriod({ id: "period-1", startDate: "2026-03-13", endDate: "2026-03-17" })
      ],
      [
        makeLog({ id: "log-1", date: "2026-05-08" }),
        makeLog({ id: "log-2", date: "2026-05-08", periodQuestion: "end" }),
        makeLog({ id: "log-3", date: "2026-05-09" })
      ],
      DEFAULT_CYCLE_SETTINGS
    );

    expect(insights).toEqual({
      averageCycleLength: 28,
      averagePeriodLength: 5.3,
      recordedDays: 2,
      cycleTrend: [
        { id: "2026-04-10", label: "4/10", value: 28 },
        { id: "2026-05-08", label: "5/8", value: 28 }
      ]
    });
  });

  test("falls back to settings when there is not enough period data", () => {
    const insights = calculateCycleInsights(
      [makePeriod({ startDate: "2026-05-08", endDate: undefined })],
      [],
      { ...DEFAULT_CYCLE_SETTINGS, averageCycleLength: 30, averagePeriodLength: 6 }
    );

    expect(insights.averageCycleLength).toBe(30);
    expect(insights.averagePeriodLength).toBe(6);
    expect(insights.recordedDays).toBe(0);
    expect(insights.cycleTrend).toEqual([]);
  });
});

describe("LocalPeriodRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("recovers to an empty period list and logs a useful error when stored data is invalid", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    localStorage.setItem("half-moon.cycle-periods", "{broken json");

    const repository = new LocalPeriodRepository();

    expect(repository.getCyclePeriods()).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DEBUG]"),
      expect.any(Error)
    );
  });

  test("fills profile defaults when stored settings are missing new fields", () => {
    localStorage.setItem(
      "half-moon.cycle-settings",
      JSON.stringify({
        averageCycleLength: 30,
        averagePeriodLength: 6
      })
    );

    const repository = new LocalPeriodRepository();

    expect(repository.getSettings()).toEqual({
      averageCycleLength: 30,
      averagePeriodLength: 6,
      age: 26,
      heightCm: 165,
      weightKg: 52
    });
  });
});

describe("createPeriodService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("answers a period prompt and returns updated summary and insights", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    const result = service.answerPeriodPrompt("2026-05-10", "start", "yes", "08:30");

    expect(result.periods).toHaveLength(1);
    expect(result.summary.phase).toBe("follicular");
    expect(result.insights.recordedDays).toBe(1);
    expect(service.getCyclePeriods()).toHaveLength(1);
  });

  test("saves structured day status details without losing existing daily status fields", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    service.saveDayStatusLog({
      date: "2026-05-19",
      periodQuestion: "start",
      periodAnswer: "no",
      time: "09:20",
      mood: "平静"
    });
    const result = service.saveDayStatusLog({
      date: "2026-05-19",
      periodQuestion: "start",
      periodAnswer: "no",
      time: "09:20",
      details: {
        temperature: 36.8
      }
    });

    expect(result.dayLogs[0]).toMatchObject({
      date: "2026-05-19",
      mood: "平静",
      details: {
        temperature: 36.8
      }
    });
  });

  test("saves editable profile fields in cycle settings", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    const result = service.saveSettings({
      averageCycleLength: 31,
      averagePeriodLength: 7,
      age: 28,
      heightCm: 168,
      weightKg: 54.5
    });

    expect(result.settings).toEqual({
      averageCycleLength: 31,
      averagePeriodLength: 7,
      age: 28,
      heightCm: 168,
      weightKg: 54.5
    });
    expect(JSON.parse(localStorage.getItem("half-moon.cycle-settings") ?? "{}")).toMatchObject({
      age: 28,
      heightCm: 168,
      weightKg: 54.5
    });
  });

  test("syncs daily weight details into profile settings", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    const result = service.saveDayStatusLog({
      date: "2026-05-19",
      periodQuestion: "start",
      periodAnswer: "no",
      time: "09:20",
      details: {
        weight: 55.2
      }
    });

    expect(result.settings.weightKg).toBe(55.2);
    expect(JSON.parse(localStorage.getItem("half-moon.cycle-settings") ?? "{}")).toMatchObject({
      weightKg: 55.2
    });
  });

  test("writes profile weight edits into today's day status details", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    const result = service.saveSettings(
      {
        averageCycleLength: 28,
        averagePeriodLength: 5,
        age: 26,
        heightCm: 165,
        weightKg: 53.8
      },
      { syncWeightToToday: true }
    );

    expect(result.dayLogs[0]).toMatchObject({
      date: "2026-05-19",
      periodQuestion: "start",
      periodAnswer: "no",
      details: {
        weight: 53.8
      }
    });
  });

  test("starts with a period-start prompt when there is no cycle period", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    const prompt = service.getPeriodPromptForDate("2026-05-19");

    expect(prompt).toEqual({
      question: "start",
      answer: null,
      time: "",
      activePeriod: null
    });
  });

  test("switches from start to end prompt on the day after a period starts", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    service.answerPeriodPrompt("2026-05-10", "start", "yes", "08:30");

    expect(service.getPeriodPromptForDate("2026-05-10")).toMatchObject({
      question: "start",
      answer: "yes",
      time: "08:30"
    });
    expect(service.getPeriodPromptForDate("2026-05-11")).toMatchObject({
      question: "end",
      answer: null
    });
  });

  test("closes a period inclusively and returns to start prompt the next day", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    service.answerPeriodPrompt("2026-05-10", "start", "yes", "08:30");
    service.answerPeriodPrompt("2026-05-14", "end", "yes", "21:15");

    expect(service.getPeriodRanges()).toMatchObject([
      {
        id: expect.any(String),
        startDate: "2026-05-10",
        startTime: "08:30",
        endDate: "2026-05-14",
        endTime: "21:15"
      }
    ]);
    expect(service.getPeriodPromptForDate("2026-05-15")).toMatchObject({
      question: "start",
      answer: null
    });
  });

  test("saves a no answer without changing the period prompt state", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    service.answerPeriodPrompt("2026-05-10", "start", "no", "09:00");

    expect(service.getPeriodPromptForDate("2026-05-10")).toMatchObject({
      question: "start",
      answer: "no",
      time: "09:00"
    });
    expect(service.getPeriodPromptForDate("2026-05-11")).toMatchObject({
      question: "start",
      answer: null
    });
    expect(service.getPeriodRanges()).toEqual([]);
  });

  test("changing a yes answer to no removes the matching boundary event", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    service.answerPeriodPrompt("2026-05-10", "start", "yes", "08:30");
    service.answerPeriodPrompt("2026-05-10", "start", "no", "10:00");

    expect(service.getPeriodRanges()).toEqual([]);
    expect(service.getPeriodPromptForDate("2026-05-11")).toMatchObject({
      question: "start",
      answer: null
    });
  });
});
