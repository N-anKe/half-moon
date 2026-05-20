export type FlowLevel = "light" | "medium" | "heavy";

export type CyclePhase = "period" | "follicular" | "fertile" | "luteal" | "unknown";
export type PeriodQuestion = "start" | "end";
export type PeriodAnswer = "yes" | "no";

export interface CyclePeriod {
  id: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface DayStatusLog {
  id: string;
  date: string;
  periodQuestion: PeriodQuestion;
  periodAnswer: PeriodAnswer;
  time: string;
  flowLevel?: FlowLevel;
  symptoms?: string[];
  mood?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayStatusLogInput {
  date: string;
  periodQuestion: PeriodQuestion;
  periodAnswer: PeriodAnswer;
  time: string;
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
  getCyclePeriods(): CyclePeriod[];
  saveCyclePeriods(periods: CyclePeriod[]): void;
  getDayStatusLogs(): DayStatusLog[];
  saveDayStatusLogs(logs: DayStatusLog[]): void;
  getSettings(): UserCycleSettings;
  saveSettings(settings: UserCycleSettings): void;
}

export interface PeriodServiceSnapshot {
  records: PeriodRecord[];
  periods: CyclePeriod[];
  dayLogs: DayStatusLog[];
  settings: UserCycleSettings;
  summary: CycleSummary;
}

export interface PeriodPrompt {
  question: PeriodQuestion;
  answer: PeriodAnswer | null;
  time: string;
  activePeriod: CyclePeriod | null;
}

export interface PeriodService {
  addRecord(input: PeriodRecordInput): PeriodServiceSnapshot;
  updateRecord(id: string, input: PeriodRecordInput): PeriodServiceSnapshot;
  deleteRecord(id: string): PeriodServiceSnapshot;
  saveDayStatusLog(input: DayStatusLogInput): PeriodServiceSnapshot;
  answerPeriodPrompt(
    date: string,
    question: PeriodQuestion,
    answer: PeriodAnswer,
    time: string
  ): PeriodServiceSnapshot;
  getPeriodPromptForDate(date: string): PeriodPrompt;
  getPeriodRanges(): CyclePeriod[];
  getRecords(): PeriodRecord[];
  getDayStatusLogs(): DayStatusLog[];
  getCyclePeriods(): CyclePeriod[];
  getSettings(): UserCycleSettings;
  saveSettings(settings: UserCycleSettings): PeriodServiceSnapshot;
  getCycleSummary(): CycleSummary;
  getSnapshot(): PeriodServiceSnapshot;
}
