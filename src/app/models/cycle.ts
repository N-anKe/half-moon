export type FlowLevel = "light" | "medium" | "heavy";

export type CyclePhase = "period" | "follicular" | "fertile" | "luteal" | "unknown";

export interface PeriodRecord {
  id: string;
  startDate: string;
  endDate?: string;
  flowLevel?: FlowLevel;
  symptoms?: string[];
  mood?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodRecordInput {
  startDate: string;
  endDate?: string;
  flowLevel?: FlowLevel;
  symptoms?: string[];
  mood?: string;
  notes?: string;
}

export interface UserCycleSettings {
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStart?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface CycleSummary {
  currentDay: number;
  phase: CyclePhase;
  nextPeriodDate: string | null;
  fertileWindow?: DateRange;
  daysUntilNextPeriod: number | null;
}

export interface PeriodRepository {
  getRecords(): PeriodRecord[];
  saveRecords(records: PeriodRecord[]): void;
  getSettings(): UserCycleSettings;
  saveSettings(settings: UserCycleSettings): void;
}

export interface PeriodServiceSnapshot {
  records: PeriodRecord[];
  settings: UserCycleSettings;
  summary: CycleSummary;
}

export interface PeriodService {
  addRecord(input: PeriodRecordInput): PeriodServiceSnapshot;
  updateRecord(id: string, input: PeriodRecordInput): PeriodServiceSnapshot;
  deleteRecord(id: string): PeriodServiceSnapshot;
  getRecords(): PeriodRecord[];
  getSettings(): UserCycleSettings;
  saveSettings(settings: UserCycleSettings): PeriodServiceSnapshot;
  getCycleSummary(): CycleSummary;
  getSnapshot(): PeriodServiceSnapshot;
}
