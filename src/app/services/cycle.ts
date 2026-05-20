import type {
  CyclePeriod,
  CyclePhase,
  CycleSummary,
  DayStatusLog,
  DayStatusLogInput,
  PeriodAnswer,
  PeriodPrompt,
  PeriodRecord,
  PeriodRecordInput,
  PeriodQuestion,
  PeriodRepository,
  PeriodService,
  PeriodServiceSnapshot,
  UserCycleSettings
} from "../models/cycle";
import { logDebugError } from "../utils/debug";

const RECORDS_KEY = "half-moon.period-records";
const PERIODS_KEY = "half-moon.cycle-periods";
const DAY_LOGS_KEY = "half-moon.day-status-logs";
const SETTINGS_KEY = "half-moon.cycle-settings";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_CYCLE_SETTINGS: UserCycleSettings = {
  averageCycleLength: 28,
  averagePeriodLength: 5
};

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  return formatDate(new Date(parseDate(value).getTime() + days * DAY_IN_MS));
}

function compareDates(first: string, second: string): number {
  return first.localeCompare(second);
}

function differenceInDays(from: string, to: Date): number {
  const fromTime = parseDate(from).getTime();
  const toDate = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  return Math.floor((toDate.getTime() - fromTime) / DAY_IN_MS);
}

function sortRecords(records: PeriodRecord[]): PeriodRecord[] {
  return [...records].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

function sortPeriods(periods: CyclePeriod[]): CyclePeriod[] {
  return [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

function sortDayLogs(logs: DayStatusLog[]): DayStatusLog[] {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date));
}

function isPeriodRecord(value: unknown): value is PeriodRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PeriodRecord>;

  return (
    typeof record.id === "string" &&
    typeof record.startDate === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

function isCyclePeriod(value: unknown): value is CyclePeriod {
  if (!value || typeof value !== "object") return false;
  const period = value as Partial<CyclePeriod>;

  return (
    typeof period.id === "string" &&
    typeof period.startDate === "string" &&
    typeof period.startTime === "string" &&
    typeof period.createdAt === "string" &&
    typeof period.updatedAt === "string"
  );
}

function isDayStatusLog(value: unknown): value is DayStatusLog {
  if (!value || typeof value !== "object") return false;
  const log = value as Partial<DayStatusLog>;

  return (
    typeof log.id === "string" &&
    typeof log.date === "string" &&
    (log.periodQuestion === "start" || log.periodQuestion === "end") &&
    (log.periodAnswer === "yes" || log.periodAnswer === "no") &&
    typeof log.time === "string" &&
    typeof log.createdAt === "string" &&
    typeof log.updatedAt === "string"
  );
}

function legacyRecordsToPeriods(records: PeriodRecord[]): CyclePeriod[] {
  const flowRecords = [...records].filter((record) => record.flowLevel).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const periods: CyclePeriod[] = [];
  let active: CyclePeriod | null = null;

  for (const record of flowRecords) {
    if (!active) {
      active = {
        id: `migrated-${record.id}`,
        startDate: record.startDate,
        startTime: "08:00",
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      };
      continue;
    }

    if (record.startDate === addDays(active.endDate ?? active.startDate, 1)) {
      active.endDate = record.startDate;
      active.endTime = "21:00";
      active.updatedAt = record.updatedAt;
      continue;
    }

    periods.push(active);
    active = {
      id: `migrated-${record.id}`,
      startDate: record.startDate,
      startTime: "08:00",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  if (active) periods.push(active);

  return sortPeriods(periods);
}

function legacyRecordsToDayLogs(records: PeriodRecord[]): DayStatusLog[] {
  return sortDayLogs(
    records.map((record) => ({
      id: `migrated-log-${record.id}`,
      date: record.startDate,
      periodQuestion: record.flowLevel ? "start" : "start",
      periodAnswer: record.flowLevel ? "yes" : "no",
      time: "08:00",
      flowLevel: record.flowLevel,
      symptoms: record.symptoms,
      mood: record.mood,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }))
  );
}

function normalizeSettings(settings: Partial<UserCycleSettings> | null): UserCycleSettings {
  return {
    averageCycleLength:
      typeof settings?.averageCycleLength === "number" && settings.averageCycleLength > 0
        ? settings.averageCycleLength
        : DEFAULT_CYCLE_SETTINGS.averageCycleLength,
    averagePeriodLength:
      typeof settings?.averagePeriodLength === "number" && settings.averagePeriodLength > 0
        ? settings.averagePeriodLength
        : DEFAULT_CYCLE_SETTINGS.averagePeriodLength,
    lastPeriodStart:
      typeof settings?.lastPeriodStart === "string" ? settings.lastPeriodStart : undefined
  };
}

function createId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `period-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolvePhase(currentDay: number, periodLength: number, fertileWindowDay: number): CyclePhase {
  if (currentDay <= 0) return "unknown";
  if (currentDay <= periodLength) return "period";
  if (currentDay >= fertileWindowDay && currentDay <= fertileWindowDay + 5) return "fertile";
  if (currentDay > fertileWindowDay + 5) return "luteal";

  return "follicular";
}

export function calculateCycleSummary(
  records: PeriodRecord[],
  settings: UserCycleSettings = DEFAULT_CYCLE_SETTINGS,
  today = new Date()
): CycleSummary {
  const latestRecord = sortRecords(records)[0];

  if (!latestRecord) {
    return {
      currentDay: 0,
      phase: "unknown",
      nextPeriodDate: null,
      daysUntilNextPeriod: null
    };
  }

  const normalizedSettings = normalizeSettings(settings);
  const elapsedDays = differenceInDays(latestRecord.startDate, today);
  const currentDay = Math.max(elapsedDays + 1, 1);
  const nextPeriodDate = addDays(latestRecord.startDate, normalizedSettings.averageCycleLength);
  const daysUntilNextPeriod = Math.max(differenceInDays(formatDate(today), parseDate(nextPeriodDate)), 0);
  const fertileWindowStart = addDays(nextPeriodDate, -16);
  const fertileWindowEnd = addDays(nextPeriodDate, -11);
  const fertileWindowDay = normalizedSettings.averageCycleLength - 15;

  return {
    currentDay,
    phase: resolvePhase(currentDay, normalizedSettings.averagePeriodLength, fertileWindowDay),
    nextPeriodDate,
    fertileWindow: {
      startDate: fertileWindowStart,
      endDate: fertileWindowEnd
    },
    daysUntilNextPeriod
  };
}

function periodToSummaryRecord(period: CyclePeriod): PeriodRecord {
  return {
    id: period.id,
    startDate: period.startDate,
    endDate: period.endDate,
    flowLevel: "medium",
    createdAt: period.createdAt,
    updatedAt: period.updatedAt
  };
}

function findPromptContext(date: string, periods: CyclePeriod[], logs: DayStatusLog[]): PeriodPrompt {
  const sortedPeriods = sortPeriods(periods);
  const boundaryPeriod = sortedPeriods.find((period) => period.startDate === date || period.endDate === date);

  if (boundaryPeriod?.startDate === date) {
    const log = logs.find((entry) => entry.date === date && entry.periodQuestion === "start");
    return {
      question: "start",
      answer: log?.periodAnswer ?? "yes",
      time: log?.time ?? boundaryPeriod.startTime,
      activePeriod: boundaryPeriod
    };
  }

  if (boundaryPeriod?.endDate === date) {
    const log = logs.find((entry) => entry.date === date && entry.periodQuestion === "end");
    return {
      question: "end",
      answer: log?.periodAnswer ?? "yes",
      time: log?.time ?? boundaryPeriod.endTime ?? "",
      activePeriod: boundaryPeriod
    };
  }

  const activePeriod = sortedPeriods.find(
    (period) =>
      compareDates(period.startDate, date) < 0 &&
      (!period.endDate || compareDates(date, period.endDate) <= 0)
  );

  if (activePeriod) {
    const log = logs.find((entry) => entry.date === date && entry.periodQuestion === "end");
    return {
      question: "end",
      answer: log?.periodAnswer ?? null,
      time: log?.time ?? "",
      activePeriod
    };
  }

  const log = logs.find((entry) => entry.date === date && entry.periodQuestion === "start");
  return {
    question: "start",
    answer: log?.periodAnswer ?? null,
    time: log?.time ?? "",
    activePeriod: null
  };
}

function upsertDayStatusLog(
  logs: DayStatusLog[],
  input: DayStatusLogInput,
  now: string
): DayStatusLog[] {
  const existingLog = logs.find(
    (log) => log.date === input.date && log.periodQuestion === input.periodQuestion
  );

  if (existingLog) {
    return sortDayLogs(
      logs.map((log) =>
        log.id === existingLog.id
          ? {
              ...log,
              ...input,
              updatedAt: now
            }
          : log
      )
    );
  }

  return sortDayLogs([
    {
      id: createId(),
      createdAt: now,
      updatedAt: now,
      ...input
    },
    ...logs
  ]);
}

export class LocalPeriodRepository implements PeriodRepository {
  getRecords(): PeriodRecord[] {
    try {
      const rawRecords = localStorage.getItem(RECORDS_KEY);
      if (!rawRecords) return [];

      const parsed = JSON.parse(rawRecords) as unknown;
      if (!Array.isArray(parsed)) return [];

      return sortRecords(parsed.filter(isPeriodRecord));
    } catch (error) {
      logDebugError("LocalPeriodRepository.getRecords", error);
      return [];
    }
  }

  saveRecords(records: PeriodRecord[]): void {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(sortRecords(records)));
    } catch (error) {
      logDebugError("LocalPeriodRepository.saveRecords", error, { count: records.length });
      throw new Error("保存经期记录失败，请稍后重试。");
    }
  }

  getCyclePeriods(): CyclePeriod[] {
    try {
      const rawPeriods = localStorage.getItem(PERIODS_KEY);
      if (rawPeriods) {
        const parsed = JSON.parse(rawPeriods) as unknown;
        if (Array.isArray(parsed)) return sortPeriods(parsed.filter(isCyclePeriod));
      }

      return legacyRecordsToPeriods(this.getRecords());
    } catch (error) {
      logDebugError("LocalPeriodRepository.getCyclePeriods", error);
      return [];
    }
  }

  saveCyclePeriods(periods: CyclePeriod[]): void {
    try {
      localStorage.setItem(PERIODS_KEY, JSON.stringify(sortPeriods(periods)));
    } catch (error) {
      logDebugError("LocalPeriodRepository.saveCyclePeriods", error, { count: periods.length });
      throw new Error("保存月经开始结束记录失败，请稍后重试。");
    }
  }

  getDayStatusLogs(): DayStatusLog[] {
    try {
      const rawLogs = localStorage.getItem(DAY_LOGS_KEY);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs) as unknown;
        if (Array.isArray(parsed)) return sortDayLogs(parsed.filter(isDayStatusLog));
      }

      return legacyRecordsToDayLogs(this.getRecords());
    } catch (error) {
      logDebugError("LocalPeriodRepository.getDayStatusLogs", error);
      return [];
    }
  }

  saveDayStatusLogs(logs: DayStatusLog[]): void {
    try {
      localStorage.setItem(DAY_LOGS_KEY, JSON.stringify(sortDayLogs(logs)));
    } catch (error) {
      logDebugError("LocalPeriodRepository.saveDayStatusLogs", error, { count: logs.length });
      throw new Error("保存每日状态记录失败，请稍后重试。");
    }
  }

  getSettings(): UserCycleSettings {
    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (!rawSettings) return DEFAULT_CYCLE_SETTINGS;

      return normalizeSettings(JSON.parse(rawSettings) as Partial<UserCycleSettings>);
    } catch (error) {
      logDebugError("LocalPeriodRepository.getSettings", error);
      return DEFAULT_CYCLE_SETTINGS;
    }
  }

  saveSettings(settings: UserCycleSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
    } catch (error) {
      logDebugError("LocalPeriodRepository.saveSettings", error, settings);
      throw new Error("保存周期设置失败，请稍后重试。");
    }
  }
}

export function createPeriodService(
  repository: PeriodRepository = new LocalPeriodRepository(),
  today = new Date()
): PeriodService {
  function snapshot(
    records = repository.getRecords(),
    settings = repository.getSettings(),
    periods = repository.getCyclePeriods(),
    dayLogs = repository.getDayStatusLogs()
  ): PeriodServiceSnapshot {
    const summaryRecords = periods.length ? periods.map(periodToSummaryRecord) : records;

    return {
      records,
      periods,
      dayLogs,
      settings,
      summary: calculateCycleSummary(summaryRecords, settings, today)
    };
  }

  return {
    addRecord(input: PeriodRecordInput) {
      try {
        const now = new Date().toISOString();
        const record: PeriodRecord = {
          id: createId(),
          createdAt: now,
          updatedAt: now,
          ...input
        };
        const records = sortRecords([record, ...repository.getRecords()]);

        repository.saveRecords(records);
        return snapshot(records);
      } catch (error) {
        logDebugError("createPeriodService.addRecord", error, input);
        throw error instanceof Error ? error : new Error("新增经期记录失败。");
      }
    },
    updateRecord(id: string, input: PeriodRecordInput) {
      try {
        const records = repository.getRecords().map((record) =>
          record.id === id ? { ...record, ...input, updatedAt: new Date().toISOString() } : record
        );

        repository.saveRecords(records);
        return snapshot(records);
      } catch (error) {
        logDebugError("createPeriodService.updateRecord", error, { id, input });
        throw error instanceof Error ? error : new Error("更新经期记录失败。");
      }
    },
    deleteRecord(id: string) {
      try {
        const records = repository.getRecords().filter((record) => record.id !== id);

        repository.saveRecords(records);
        return snapshot(records);
      } catch (error) {
        logDebugError("createPeriodService.deleteRecord", error, { id });
        throw error instanceof Error ? error : new Error("删除经期记录失败。");
      }
    },
    saveDayStatusLog(input: DayStatusLogInput) {
      try {
        const logs = upsertDayStatusLog(repository.getDayStatusLogs(), input, new Date().toISOString());

        repository.saveDayStatusLogs(logs);
        return snapshot(undefined, undefined, undefined, logs);
      } catch (error) {
        logDebugError("createPeriodService.saveDayStatusLog", error, input);
        throw error instanceof Error ? error : new Error("保存每日状态失败。");
      }
    },
    answerPeriodPrompt(date: string, question: PeriodQuestion, answer: PeriodAnswer, time: string) {
      try {
        const now = new Date().toISOString();
        const existingPeriods = repository.getCyclePeriods();
        const existingLogs = repository.getDayStatusLogs();
        let periods = existingPeriods;
        const logs = upsertDayStatusLog(
          existingLogs,
          {
            date,
            periodQuestion: question,
            periodAnswer: answer,
            time
          },
          now
        );

        if (question === "start") {
          const sameDayPeriod = periods.find((period) => period.startDate === date);
          if (answer === "yes" && !sameDayPeriod) {
            periods = sortPeriods([
              {
                id: createId(),
                startDate: date,
                startTime: time,
                createdAt: now,
                updatedAt: now
              },
              ...periods
            ]);
          }
          if (answer === "yes" && sameDayPeriod) {
            periods = sortPeriods(
              periods.map((period) =>
                period.id === sameDayPeriod.id ? { ...period, startTime: time, updatedAt: now } : period
              )
            );
          }
          if (answer === "no") {
            periods = sortPeriods(periods.filter((period) => period.startDate !== date));
          }
        }

        if (question === "end") {
          const prompt = findPromptContext(date, periods, logs);
          const targetPeriod = prompt.activePeriod;

          if (answer === "yes" && targetPeriod) {
            periods = sortPeriods(
              periods.map((period) =>
                period.id === targetPeriod.id
                  ? {
                      ...period,
                      endDate: date,
                      endTime: time,
                      updatedAt: now
                    }
                  : period
              )
            );
          }
          if (answer === "no") {
            periods = sortPeriods(
              periods.map((period) =>
                period.endDate === date
                  ? {
                      ...period,
                      endDate: undefined,
                      endTime: undefined,
                      updatedAt: now
                    }
                  : period
              )
            );
          }
        }

        repository.saveCyclePeriods(periods);
        repository.saveDayStatusLogs(logs);
        return snapshot(undefined, undefined, periods, logs);
      } catch (error) {
        logDebugError("createPeriodService.answerPeriodPrompt", error, { date, question, answer, time });
        throw error instanceof Error ? error : new Error("保存月经开始结束状态失败。");
      }
    },
    getPeriodPromptForDate(date: string) {
      return findPromptContext(date, repository.getCyclePeriods(), repository.getDayStatusLogs());
    },
    getPeriodRanges() {
      return repository.getCyclePeriods();
    },
    getRecords() {
      return repository.getRecords();
    },
    getDayStatusLogs() {
      return repository.getDayStatusLogs();
    },
    getCyclePeriods() {
      return repository.getCyclePeriods();
    },
    getSettings() {
      return repository.getSettings();
    },
    saveSettings(settings: UserCycleSettings) {
      const normalizedSettings = normalizeSettings(settings);
      repository.saveSettings(normalizedSettings);
      return snapshot(repository.getRecords(), normalizedSettings);
    },
    getCycleSummary() {
      return snapshot().summary;
    },
    getSnapshot() {
      return snapshot();
    }
  };
}
