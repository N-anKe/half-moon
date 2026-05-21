import type {
  CycleInsights,
  CyclePeriod,
  CyclePhase,
  CycleSummary,
  DayStatusLog,
  DayStatusLogInput,
  PeriodAnswer,
  PeriodPrompt,
  PeriodQuestion,
  PeriodRepository,
  PeriodService,
  PeriodServiceSnapshot,
  SaveSettingsOptions,
  UserCycleSettings
} from "../models/cycle";
import { logDebugError } from "../utils/debug";

const PERIODS_KEY = "half-moon.cycle-periods";
const DAY_LOGS_KEY = "half-moon.day-status-logs";
const SETTINGS_KEY = "half-moon.cycle-settings";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_CYCLE_SETTINGS: UserCycleSettings = {
  averageCycleLength: 28,
  averagePeriodLength: 5,
  age: 26,
  heightCm: 165,
  weightKg: 52
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

function sortPeriods(periods: CyclePeriod[]): CyclePeriod[] {
  return [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

function sortDayLogs(logs: DayStatusLog[]): DayStatusLog[] {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date));
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

function normalizeSettings(settings: Partial<UserCycleSettings> | null): UserCycleSettings {
  const normalized: UserCycleSettings = {
    averageCycleLength:
      typeof settings?.averageCycleLength === "number" && settings.averageCycleLength > 0
        ? settings.averageCycleLength
        : DEFAULT_CYCLE_SETTINGS.averageCycleLength,
    averagePeriodLength:
      typeof settings?.averagePeriodLength === "number" && settings.averagePeriodLength > 0
        ? settings.averagePeriodLength
        : DEFAULT_CYCLE_SETTINGS.averagePeriodLength,
    age:
      typeof settings?.age === "number" && settings.age > 0
        ? settings.age
        : DEFAULT_CYCLE_SETTINGS.age,
    heightCm:
      typeof settings?.heightCm === "number" && settings.heightCm > 0
        ? settings.heightCm
        : DEFAULT_CYCLE_SETTINGS.heightCm,
    weightKg:
      typeof settings?.weightKg === "number" && settings.weightKg > 0
        ? settings.weightKg
        : DEFAULT_CYCLE_SETTINGS.weightKg
  };

  if (typeof settings?.lastPeriodStart === "string") {
    normalized.lastPeriodStart = settings.lastPeriodStart;
  }

  return normalized;
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

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  if (!values.length) return null;

  return roundToOneDecimal(values.reduce((total, value) => total + value, 0) / values.length);
}

function formatTrendLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);

  return `${month}/${day}`;
}

export function calculateCycleSummary(
  periods: CyclePeriod[],
  settings: UserCycleSettings = DEFAULT_CYCLE_SETTINGS,
  today = new Date()
): CycleSummary {
  const latestPeriod = sortPeriods(periods)[0];

  if (!latestPeriod) {
    return {
      currentDay: 0,
      phase: "unknown",
      nextPeriodDate: null,
      daysUntilNextPeriod: null
    };
  }

  const normalizedSettings = normalizeSettings(settings);
  const elapsedDays = differenceInDays(latestPeriod.startDate, today);
  const currentDay = Math.max(elapsedDays + 1, 1);
  const nextPeriodDate = addDays(latestPeriod.startDate, normalizedSettings.averageCycleLength);
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

export function calculateCycleInsights(
  periods: CyclePeriod[],
  dayLogs: DayStatusLog[],
  settings: UserCycleSettings = DEFAULT_CYCLE_SETTINGS
): CycleInsights {
  const normalizedSettings = normalizeSettings(settings);
  const ascendingPeriods = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const cycleLengths = ascendingPeriods.slice(1).map((period, index) => {
    const previousPeriod = ascendingPeriods[index];

    return differenceInDays(previousPeriod.startDate, parseDate(period.startDate));
  });
  const closedPeriodLengths = ascendingPeriods
    .filter((period) => period.endDate)
    .map((period) => differenceInDays(period.startDate, parseDate(period.endDate as string)) + 1);
  const cycleTrend = cycleLengths.slice(-6).map((value, index) => {
    const period = ascendingPeriods[ascendingPeriods.length - cycleLengths.slice(-6).length + index];

    return {
      id: period.startDate,
      label: formatTrendLabel(period.startDate),
      value
    };
  });

  return {
    averageCycleLength: average(cycleLengths) ?? normalizedSettings.averageCycleLength,
    averagePeriodLength: average(closedPeriodLengths) ?? normalizedSettings.averagePeriodLength,
    cycleTrend,
    recordedDays: new Set(dayLogs.map((log) => log.date)).size
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
              details: input.details ? { ...log.details, ...input.details } : log.details,
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
  getCyclePeriods(): CyclePeriod[] {
    try {
      const rawPeriods = localStorage.getItem(PERIODS_KEY);
      if (!rawPeriods) return [];

      const parsed = JSON.parse(rawPeriods) as unknown;
      if (!Array.isArray(parsed)) return [];

      return sortPeriods(parsed.filter(isCyclePeriod));
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
      if (!rawLogs) return [];

      const parsed = JSON.parse(rawLogs) as unknown;
      if (!Array.isArray(parsed)) return [];

      return sortDayLogs(parsed.filter(isDayStatusLog));
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
  function upsertTodayWeightLog(logs: DayStatusLog[], weightKg: number): DayStatusLog[] {
    return upsertDayStatusLog(
      logs,
      {
        date: formatDate(today),
        periodQuestion: "start",
        periodAnswer: "no",
        time: "09:00",
        details: {
          weight: weightKg
        }
      },
      new Date().toISOString()
    );
  }

  function snapshot(
    settings = repository.getSettings(),
    periods = repository.getCyclePeriods(),
    dayLogs = repository.getDayStatusLogs()
  ): PeriodServiceSnapshot {
    return {
      periods,
      dayLogs,
      settings,
      summary: calculateCycleSummary(periods, settings, today),
      insights: calculateCycleInsights(periods, dayLogs, settings)
    };
  }

  return {
    saveDayStatusLog(input: DayStatusLogInput) {
      try {
        const logs = upsertDayStatusLog(repository.getDayStatusLogs(), input, new Date().toISOString());
        let settings = repository.getSettings();

        repository.saveDayStatusLogs(logs);
        if (typeof input.details?.weight === "number" && input.details.weight > 0) {
          settings = normalizeSettings({ ...settings, weightKg: input.details.weight });
          repository.saveSettings(settings);
        }

        return snapshot(settings, undefined, logs);
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
        return snapshot(undefined, periods, logs);
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
    getDayStatusLogs() {
      return repository.getDayStatusLogs();
    },
    getCyclePeriods() {
      return repository.getCyclePeriods();
    },
    getSettings() {
      return repository.getSettings();
    },
    saveSettings(settings: UserCycleSettings, options: SaveSettingsOptions = {}) {
      const normalizedSettings = normalizeSettings(settings);
      repository.saveSettings(normalizedSettings);
      if (!options.syncWeightToToday) return snapshot(normalizedSettings);

      const logs = upsertTodayWeightLog(repository.getDayStatusLogs(), normalizedSettings.weightKg);
      repository.saveDayStatusLogs(logs);

      return snapshot(normalizedSettings, undefined, logs);
    },
    getCycleSummary() {
      return snapshot().summary;
    },
    getSnapshot() {
      return snapshot();
    }
  };
}
