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
  details?: DayStatusDetails;
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
  details?: DayStatusDetails;
}

export interface DayStatusDetails {
  color?: string;
  intimacy?: {
    status: string;
    protected?: boolean;
    notes?: string;
  };
  symptoms?: string[];
  discharge?: {
    amount?: string;
    texture?: string;
    color?: string;
  };
  temperature?: number;
  weight?: number;
  diary?: string;
  habits?: string[];
}

export interface UserCycleSettings {
  averageCycleLength: number;
  averagePeriodLength: number;
  age: number;
  heightCm: number;
  weightKg: number;
  lastPeriodStart?: string;
}

export interface SaveSettingsOptions {
  syncWeightToToday?: boolean;
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

export interface CycleTrendPoint {
  id: string;
  label: string;
  value: number;
}

export interface CycleInsights {
  averageCycleLength: number;
  averagePeriodLength: number;
  cycleTrend: CycleTrendPoint[];
  recordedDays: number;
}

export interface PeriodRepository {
  getCyclePeriods(): CyclePeriod[];
  saveCyclePeriods(periods: CyclePeriod[]): void;
  getDayStatusLogs(): DayStatusLog[];
  saveDayStatusLogs(logs: DayStatusLog[]): void;
  getSettings(): UserCycleSettings;
  saveSettings(settings: UserCycleSettings): void;
}

export interface PeriodServiceSnapshot {
  periods: CyclePeriod[];
  dayLogs: DayStatusLog[];
  settings: UserCycleSettings;
  summary: CycleSummary;
  insights: CycleInsights;
}

export interface PeriodPrompt {
  question: PeriodQuestion;
  answer: PeriodAnswer | null;
  time: string;
  activePeriod: CyclePeriod | null;
}

export interface PeriodService {
  saveDayStatusLog(input: DayStatusLogInput): PeriodServiceSnapshot;
  answerPeriodPrompt(
    date: string,
    question: PeriodQuestion,
    answer: PeriodAnswer,
    time: string
  ): PeriodServiceSnapshot;
  getPeriodPromptForDate(date: string): PeriodPrompt;
  getPeriodRanges(): CyclePeriod[];
  getDayStatusLogs(): DayStatusLog[];
  getCyclePeriods(): CyclePeriod[];
  getSettings(): UserCycleSettings;
  saveSettings(settings: UserCycleSettings, options?: SaveSettingsOptions): PeriodServiceSnapshot;
  getCycleSummary(): CycleSummary;
  getSnapshot(): PeriodServiceSnapshot;
}
