import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  DEFAULT_CYCLE_SETTINGS,
  calculateCycleSummary,
  createPeriodService,
  LocalPeriodRepository
} from "./cycle";
import type { PeriodRecord } from "../models/cycle";

const fixedToday = new Date("2026-05-19T08:00:00.000Z");

function makeRecord(overrides: Partial<PeriodRecord> = {}): PeriodRecord {
  return {
    id: "record-1",
    startDate: "2026-05-10",
    endDate: "2026-05-14",
    flowLevel: "medium",
    symptoms: ["cramps"],
    mood: "calm",
    notes: "测试记录",
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
    ...overrides
  };
}

describe("calculateCycleSummary", () => {
  test("returns an empty-state summary when there are no records", () => {
    const summary = calculateCycleSummary([], DEFAULT_CYCLE_SETTINGS, fixedToday);

    expect(summary.phase).toBe("unknown");
    expect(summary.currentDay).toBe(0);
    expect(summary.daysUntilNextPeriod).toBeNull();
    expect(summary.nextPeriodDate).toBeNull();
  });

  test("predicts current cycle status from the latest period record", () => {
    const summary = calculateCycleSummary([makeRecord()], DEFAULT_CYCLE_SETTINGS, fixedToday);

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

describe("LocalPeriodRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("recovers to an empty list and logs a useful error when stored data is invalid", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    localStorage.setItem("half-moon.period-records", "{broken json");

    const repository = new LocalPeriodRepository();

    expect(repository.getRecords()).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DEBUG]"),
      expect.any(Error)
    );
  });
});

describe("createPeriodService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("adds a period record and returns an updated cycle summary", () => {
    const service = createPeriodService(new LocalPeriodRepository(), fixedToday);

    const result = service.addRecord({
      startDate: "2026-05-10",
      endDate: "2026-05-14",
      flowLevel: "medium",
      symptoms: ["cramps"],
      mood: "calm",
      notes: "第一条记录"
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      startDate: "2026-05-10",
      endDate: "2026-05-14",
      flowLevel: "medium"
    });
    expect(result.summary.phase).toBe("follicular");
    expect(service.getRecords()).toHaveLength(1);
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
