import type {
  CyclePhase,
  CycleSummary,
  PeriodRecord,
  PeriodRecordInput,
  PeriodRepository,
  PeriodService,
  PeriodServiceSnapshot,
  UserCycleSettings
} from "../models/cycle";
import { logDebugError } from "../utils/debug";

const RECORDS_KEY = "half-moon.period-records";
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

function differenceInDays(from: string, to: Date): number {
  const fromTime = parseDate(from).getTime();
  const toDate = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  return Math.floor((toDate.getTime() - fromTime) / DAY_IN_MS);
}

function sortRecords(records: PeriodRecord[]): PeriodRecord[] {
  return [...records].sort((a, b) => b.startDate.localeCompare(a.startDate));
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
  function snapshot(records = repository.getRecords(), settings = repository.getSettings()): PeriodServiceSnapshot {
    return {
      records,
      settings,
      summary: calculateCycleSummary(records, settings, today)
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
    getRecords() {
      return repository.getRecords();
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
