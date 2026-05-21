import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BatteryLow,
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CirclePlus,
  Droplet,
  Droplets,
  Frown,
  Heart,
  HeartPulse,
  type LucideIcon,
  Meh,
  Moon,
  Palette,
  Scale,
  Smile,
  Sparkles,
  Thermometer,
  ToggleLeft,
  X,
  Zap
} from "lucide-react";
import type {
  CyclePeriod,
  CycleSummary,
  DayStatusDetails,
  DayStatusLog,
  DayStatusLogInput,
  PeriodAnswer,
  PeriodPrompt,
  PeriodQuestion,
  UserCycleSettings
} from "../models/cycle";
import { cn } from "./ui/utils";

interface HomeTabProps {
  summary: CycleSummary;
  periods: CyclePeriod[];
  dayLogs: DayStatusLog[];
  settings: UserCycleSettings;
  getPeriodPromptForDate: (date: string) => PeriodPrompt;
  onAnswerPeriodPrompt: (
    date: string,
    question: PeriodQuestion,
    answer: PeriodAnswer,
    time: string
  ) => void;
  onSaveDayStatus: (input: DayStatusLogInput) => void;
}

interface DayLogDraft {
  flow: string;
  pain: string;
  mood: string;
}

type DetailStatusKey =
  | "color"
  | "intimacy"
  | "symptoms"
  | "discharge"
  | "temperature"
  | "weight"
  | "diary"
  | "habits";

interface CalendarDay {
  date: Date;
  day: number;
  currentMonth: boolean;
}

type PeriodRangeRole = "single" | "start" | "middle" | "end";

const WEEK_DAYS = ["一", "二", "三", "四", "五", "六", "日"];
const FLOW_OPTIONS = ["无", "少量", "正常", "偏多"];
const PAIN_OPTIONS = ["无痛", "轻微", "明显", "严重"];
const MOOD_OPTIONS = ["开心", "平静", "疲惫", "烦躁"];
const PERIOD_OPTIONS = ["是", "否"];
const DETAIL_STATUS_ROWS: Array<{ key: DetailStatusKey; title: string; icon: ReactNode }> = [
  { key: "color", title: "颜色", icon: <Palette className="h-4 w-4" /> },
  { key: "intimacy", title: "爱爱", icon: <Heart className="h-4 w-4" /> },
  { key: "symptoms", title: "症状", icon: <HeartPulse className="h-4 w-4" /> },
  { key: "discharge", title: "白带", icon: <Droplets className="h-4 w-4" /> },
  { key: "temperature", title: "体温", icon: <Thermometer className="h-4 w-4" /> },
  { key: "weight", title: "体重", icon: <Scale className="h-4 w-4" /> },
  { key: "diary", title: "日记", icon: <BookOpenText className="h-4 w-4" /> },
  { key: "habits", title: "好习惯", icon: <Activity className="h-4 w-4" /> }
];
const DETAIL_STATUS_TITLES = new Map(DETAIL_STATUS_ROWS.map((row) => [row.key, row.title]));
const COLOR_OPTIONS = ["鲜红", "暗红", "粉红", "褐色", "黑褐"];
const INTIMACY_OPTIONS = ["有保护", "无保护", "仅亲密"];
const SYMPTOM_OPTIONS = ["腹痛", "腰酸", "乳房胀痛", "头痛", "疲惫"];
const DISCHARGE_AMOUNT_OPTIONS = ["少量", "适中", "偏多"];
const DISCHARGE_TEXTURE_OPTIONS = ["水样", "乳状", "粘稠"];
const DISCHARGE_COLOR_OPTIONS = ["透明", "白色", "淡黄"];
const HABIT_OPTIONS = ["喝水", "运动", "早睡", "护肤", "补铁"];

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatWeekday(date: Date): string {
  return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
}

function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addCalendarMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function monthTitle(date: Date): string {
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
}

function buildMonthCalendar(visibleMonth: Date): CalendarDay[] {
  const days: CalendarDay[] = [];
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingDays + monthEnd.getDate()) / 7) * 7;
  const gridStart = addCalendarDays(monthStart, -leadingDays);

  for (let index = 0; index < totalCells; index += 1) {
    const date = addCalendarDays(gridStart, index);
    days.push({
      date,
      day: date.getDate(),
      currentMonth: date.getMonth() === visibleMonth.getMonth()
    });
  }

  return days;
}

function dayLogMapByDate(logs: DayStatusLog[]): Map<string, DayStatusLog> {
  return new Map(logs.map((log) => [log.date, log]));
}

function flowLabelFromLog(log: DayStatusLog | undefined, fallback = "无"): string {
  if (log?.flowLevel === "light") return "少量";
  if (log?.flowLevel === "medium") return "正常";
  if (log?.flowLevel === "heavy") return "偏多";

  return fallback;
}

function draftFromLog(log: DayStatusLog | undefined, fallback: DayLogDraft): DayLogDraft {
  if (!log) return fallback;

  return {
    flow: flowLabelFromLog(log),
    pain: log.symptoms?.[0] ?? "无痛",
    mood: log.mood ?? "平静"
  };
}

function draftForNewDate(logsByDate: Map<string, DayStatusLog>, date: Date): DayLogDraft {
  const previousLog = logsByDate.get(formatDateInput(addCalendarDays(date, -1)));

  return {
    flow: flowLabelFromLog(previousLog),
    pain: "无痛",
    mood: "平静"
  };
}

function isDateWithinPeriod(dateKey: string, period: CyclePeriod, openEndDate: string): boolean {
  const endDate = period.endDate ?? openEndDate;
  return dateKey >= period.startDate && dateKey <= endDate;
}

function periodRoleForDate(periods: CyclePeriod[], date: Date, openEndDate: string): PeriodRangeRole | null {
  const currentKey = formatDateInput(date);
  const previousKey = formatDateInput(addCalendarDays(date, -1));
  const nextKey = formatDateInput(addCalendarDays(date, 1));
  const currentPeriod = periods.find((period) => isDateWithinPeriod(currentKey, period, openEndDate));
  if (!currentPeriod) return null;

  const hasPrevious = periods.some((period) => isDateWithinPeriod(previousKey, period, openEndDate));
  const hasNext = periods.some((period) => isDateWithinPeriod(nextKey, period, openEndDate));

  if (hasPrevious && hasNext) return "middle";
  if (hasPrevious) return "end";
  if (hasNext) return "start";

  return "single";
}

function isPredictedPeriodDate(date: Date, summary: CycleSummary, settings: UserCycleSettings): boolean {
  if (!summary.nextPeriodDate) return false;

  const current = formatDateInput(date);
  const nextPeriodStart = new Date(`${summary.nextPeriodDate}T00:00:00`);

  for (let offset = 0; offset < settings.averagePeriodLength; offset += 1) {
    if (formatDateInput(addCalendarDays(nextPeriodStart, offset)) === current) return true;
  }

  return false;
}

function periodLabel(role: PeriodRangeRole | null, log: DayStatusLog | undefined): string {
  if (!role) return log ? "非经期" : "";
  if (role === "single") return "经期开始 经期结束";
  if (role === "start") return "经期开始";
  if (role === "middle") return "经期中";

  return "经期结束";
}

function currentTimeInput(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function hasStructuredDetails(log: DayStatusLog | undefined): boolean {
  if (!log?.details) return false;

  return Object.values(log.details).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.values(value).some(Boolean);
    return Boolean(value);
  });
}

function iconForFlow(flowLevel: DayStatusLog["flowLevel"]) {
  if (flowLevel === "light") {
    return { Icon: Droplet, label: "流量 少量", color: "#F5A3B7", strokeWidth: 2 };
  }
  if (flowLevel === "medium") {
    return { Icon: Droplets, label: "流量 正常", color: "#E94D8A", strokeWidth: 2 };
  }
  if (flowLevel === "heavy") {
    return { Icon: Droplets, label: "流量 偏多", color: "#C92A68", strokeWidth: 2.6 };
  }

  return null;
}

function iconForPain(log: DayStatusLog) {
  const pain = log.symptoms?.find((symptom) => PAIN_OPTIONS.includes(symptom));
  if (pain === "轻微") {
    return { Icon: HeartPulse, label: "痛经 轻微", color: "#F0A35E", strokeWidth: 2 };
  }
  if (pain === "明显") {
    return { Icon: Zap, label: "痛经 明显", color: "#E67E22", strokeWidth: 2.2 };
  }
  if (pain === "严重") {
    return { Icon: CircleAlert, label: "痛经 严重", color: "#D94848", strokeWidth: 2.2 };
  }
  if (log.details?.symptoms?.length) {
    return { Icon: HeartPulse, label: "症状 已记录", color: "#B86D92", strokeWidth: 2 };
  }

  return null;
}

function iconForMood(mood: string | undefined) {
  if (mood === "开心") return { Icon: Smile, label: "心情 开心", color: "#F2B84B", strokeWidth: 2 };
  if (mood === "平静") return { Icon: Meh, label: "心情 平静", color: "#7BA7A0", strokeWidth: 2 };
  if (mood === "疲惫") return { Icon: BatteryLow, label: "心情 疲惫", color: "#8B93A7", strokeWidth: 2 };
  if (mood === "烦躁") return { Icon: Frown, label: "心情 烦躁", color: "#B86D76", strokeWidth: 2 };

  return null;
}

function CalendarRecordIcons({ log }: { log: DayStatusLog }) {
  const icons = [iconForFlow(log.flowLevel), iconForPain(log), iconForMood(log.mood)].filter(Boolean) as Array<{
    Icon: LucideIcon;
    label: string;
    color: string;
    strokeWidth: number;
  }>;

  if (!icons.length && hasStructuredDetails(log)) {
    icons.push({ Icon: Check, label: "详情 已记录", color: "#8B93A7", strokeWidth: 2.2 });
  }

  return (
    <span className="mt-1 flex h-3 items-center justify-center gap-0.5" aria-label="已记录">
      {icons.slice(0, 3).map(({ Icon, label, color, strokeWidth }) => (
        <span key={label} aria-label={label} role="img">
          <Icon
            aria-hidden="true"
            className="h-2.5 w-2.5"
            color={color}
            strokeWidth={strokeWidth}
          />
        </span>
      ))}
    </span>
  );
}

function toggleListValue(values: string[] | undefined, option: string): string[] {
  const current = values ?? [];
  if (current.includes(option)) return current.filter((value) => value !== option);

  return [...current, option];
}

function defaultDetailsForKey(key: DetailStatusKey, details: DayStatusDetails | undefined): DayStatusDetails {
  if (key === "color") return { color: details?.color ?? "鲜红" };
  if (key === "intimacy") {
    return {
      intimacy: details?.intimacy ?? {
        status: "有保护",
        protected: true,
        notes: ""
      }
    };
  }
  if (key === "symptoms") return { symptoms: details?.symptoms ?? [] };
  if (key === "discharge") {
    return {
      discharge: details?.discharge ?? {
        amount: "适中",
        texture: "乳状",
        color: "透明"
      }
    };
  }
  if (key === "temperature") return { temperature: details?.temperature ?? 36.6 };
  if (key === "weight") return { weight: details?.weight ?? 50 };
  if (key === "diary") return { diary: details?.diary ?? "" };

  return { habits: details?.habits ?? [] };
}

function patchForKey(key: DetailStatusKey, draft: DayStatusDetails): DayStatusDetails {
  if (key === "color") return { color: draft.color };
  if (key === "intimacy") return { intimacy: draft.intimacy };
  if (key === "symptoms") return { symptoms: draft.symptoms ?? [] };
  if (key === "discharge") return { discharge: draft.discharge };
  if (key === "temperature") return { temperature: draft.temperature };
  if (key === "weight") return { weight: draft.weight };
  if (key === "diary") return { diary: draft.diary?.trim() ?? "" };

  return { habits: draft.habits ?? [] };
}

function ChoiceGroup({
  label,
  options,
  selected,
  onSelect
}: {
  label: string;
  options: string[];
  selected: string | undefined;
  onSelect: (option: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(option)}
              className={cn(
                "min-h-9 rounded-full px-3 text-[13px] font-semibold transition",
                active
                  ? "bg-[#E94D8A] text-white shadow-[0_6px_14px_rgba(233,77,138,0.2)]"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiChoiceGroup({
  label,
  options,
  selected,
  onToggle
}: {
  label: string;
  options: string[];
  selected: string[] | undefined;
  onToggle: (option: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected?.includes(option) ?? false;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={cn(
                "min-h-9 rounded-full px-3 text-[13px] font-semibold transition",
                active
                  ? "bg-[#1D1D1F] text-white shadow-[0_6px_14px_rgba(29,29,31,0.14)]"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayStatusSheet({
  statusKey,
  dateTitle,
  existingDetails,
  onClose,
  onConfirm
}: {
  statusKey: DetailStatusKey;
  dateTitle: string;
  existingDetails: DayStatusDetails | undefined;
  onClose: () => void;
  onConfirm: (details: DayStatusDetails) => void;
}) {
  const [draft, setDraft] = useState<DayStatusDetails>(() =>
    defaultDetailsForKey(statusKey, existingDetails)
  );
  const title = DETAIL_STATUS_TITLES.get(statusKey) ?? "记录";
  const dialogTitle = `记录${title}`;

  function updateDraft(nextDraft: DayStatusDetails) {
    setDraft((current) => ({ ...current, ...nextDraft }));
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={dialogTitle}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[75dvh] w-full max-w-[430px] overflow-hidden rounded-t-[34px] bg-white shadow-[0_-18px_50px_rgba(31,41,55,0.2)] sm:bottom-8"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <button
            type="button"
            aria-label="关闭记录弹窗"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{dialogTitle}</h2>
            <p className="mt-1 text-[12px] text-gray-400">{dateTitle}</p>
          </div>
          <button
            type="button"
            aria-label="保存记录详情"
            onClick={() => onConfirm(patchForKey(statusKey, draft))}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D1D1F] text-white shadow-[0_10px_22px_rgba(29,29,31,0.18)] transition active:scale-95"
          >
            <Check className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {statusKey === "color" ? (
            <ChoiceGroup
              label="经血颜色"
              options={COLOR_OPTIONS}
              selected={draft.color}
              onSelect={(color) => updateDraft({ color })}
            />
          ) : null}

          {statusKey === "intimacy" ? (
            <>
              <ChoiceGroup
                label="状态"
                options={INTIMACY_OPTIONS}
                selected={draft.intimacy?.status}
                onSelect={(status) =>
                  updateDraft({
                    intimacy: {
                      ...draft.intimacy,
                      status,
                      protected: status === "有保护" ? true : status === "无保护" ? false : undefined
                    }
                  })
                }
              />
              <label className="block space-y-2 text-[13px] font-semibold text-gray-500">
                备注
                <textarea
                  value={draft.intimacy?.notes ?? ""}
                  onChange={(event) =>
                    updateDraft({
                      intimacy: {
                        ...draft.intimacy,
                        status: draft.intimacy?.status ?? "有保护",
                        notes: event.target.value
                      }
                    })
                  }
                  className="min-h-24 w-full resize-none rounded-[22px] border border-gray-100 bg-gray-50 px-4 py-3 text-[15px] font-normal text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#E94D8A]/20"
                  placeholder="可记录感受或提醒"
                />
              </label>
            </>
          ) : null}

          {statusKey === "symptoms" ? (
            <MultiChoiceGroup
              label="症状"
              options={SYMPTOM_OPTIONS}
              selected={draft.symptoms}
              onToggle={(symptom) => updateDraft({ symptoms: toggleListValue(draft.symptoms, symptom) })}
            />
          ) : null}

          {statusKey === "discharge" ? (
            <>
              <ChoiceGroup
                label="白带量"
                options={DISCHARGE_AMOUNT_OPTIONS}
                selected={draft.discharge?.amount}
                onSelect={(amount) =>
                  updateDraft({ discharge: { ...draft.discharge, amount } })
                }
              />
              <ChoiceGroup
                label="质地"
                options={DISCHARGE_TEXTURE_OPTIONS}
                selected={draft.discharge?.texture}
                onSelect={(texture) =>
                  updateDraft({ discharge: { ...draft.discharge, texture } })
                }
              />
              <ChoiceGroup
                label="颜色"
                options={DISCHARGE_COLOR_OPTIONS}
                selected={draft.discharge?.color}
                onSelect={(color) => updateDraft({ discharge: { ...draft.discharge, color } })}
              />
            </>
          ) : null}

          {statusKey === "temperature" ? (
            <label className="block space-y-2 text-[13px] font-semibold text-gray-500">
              体温数值
              <input
                aria-label="体温数值"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={draft.temperature ?? ""}
                onChange={(event) =>
                  updateDraft({
                    temperature: event.target.value ? Number(event.target.value) : undefined
                  })
                }
                className="h-14 w-full rounded-[22px] border border-gray-100 bg-gray-50 px-4 text-[22px] font-semibold text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#E94D8A]/20"
              />
              <span className="block text-[12px] font-medium text-gray-400">单位：°C</span>
            </label>
          ) : null}

          {statusKey === "weight" ? (
            <label className="block space-y-2 text-[13px] font-semibold text-gray-500">
              体重数值
              <input
                aria-label="体重数值"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={draft.weight ?? ""}
                onChange={(event) =>
                  updateDraft({
                    weight: event.target.value ? Number(event.target.value) : undefined
                  })
                }
                className="h-14 w-full rounded-[22px] border border-gray-100 bg-gray-50 px-4 text-[22px] font-semibold text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#E94D8A]/20"
              />
              <span className="block text-[12px] font-medium text-gray-400">单位：kg</span>
            </label>
          ) : null}

          {statusKey === "diary" ? (
            <label className="block space-y-2 text-[13px] font-semibold text-gray-500">
              今天想记录什么
              <textarea
                value={draft.diary ?? ""}
                onChange={(event) => updateDraft({ diary: event.target.value })}
                className="min-h-40 w-full resize-none rounded-[24px] border border-gray-100 bg-gray-50 px-4 py-3 text-[15px] font-normal leading-7 text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#E94D8A]/20"
                placeholder="身体感受、睡眠、情绪..."
              />
            </label>
          ) : null}

          {statusKey === "habits" ? (
            <MultiChoiceGroup
              label="好习惯"
              options={HABIT_OPTIONS}
              selected={draft.habits}
              onToggle={(habit) => updateDraft({ habits: toggleListValue(draft.habits, habit) })}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StatusRow({
  title,
  icon,
  options,
  selected,
  onSelect
}: {
  title: string;
  icon: ReactNode;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between border-b border-gray-100 py-2.5 last:border-b-0">
      <div className="flex min-w-[86px] items-center gap-2 text-[#1D1D1F]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FDECEF] text-[#DFA4A9]">
          {icon}
        </span>
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      <div className="flex flex-1 justify-end gap-1.5">
        {options.map((option) => {
          const isSelected = selected === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option)}
              className={cn(
                "min-h-8 rounded-full px-3 text-[13px] font-semibold transition",
                isSelected
                  ? "bg-[#E94D8A] text-white shadow-[0_4px_12px_rgba(233,77,138,0.22)]"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PassiveStatusRow({
  title,
  icon,
  onAdd
}: {
  title: string;
  icon: ReactNode;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between border-b border-gray-100 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2 text-[#1D1D1F]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7EEF8] text-[#A85EC8]">
          {icon}
        </span>
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#D66D92] transition hover:bg-[#FDECEF]"
        aria-label={`添加${title}`}
      >
        <CirclePlus className="h-5 w-5" />
      </button>
    </div>
  );
}

export function HomeTab({
  summary,
  periods,
  dayLogs,
  settings,
  getPeriodPromptForDate,
  onAnswerPeriodPrompt,
  onSaveDayStatus
}: HomeTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeDetailKey, setActiveDetailKey] = useState<DetailStatusKey | null>(null);
  const [boundaryTime, setBoundaryTime] = useState(currentTimeInput);
  const [draft, setDraft] = useState<DayLogDraft>({
    flow: "无",
    pain: "无痛",
    mood: "平静"
  });
  const today = new Date(2026, 4, 19);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const calendarDays = useMemo(() => buildMonthCalendar(visibleMonth), [visibleMonth]);
  const logsByDate = useMemo(() => dayLogMapByDate(dayLogs), [dayLogs]);

  function openDate(date: Date) {
    const dateKey = formatDateInput(date);
    const existingLog = logsByDate.get(dateKey);
    const prompt = getPeriodPromptForDate(dateKey);
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setSelectedDate(date);
    setBoundaryTime(prompt.time || currentTimeInput());
    setDraft(draftFromLog(existingLog, draftForNewDate(logsByDate, date)));
  }

  function buildDayLogInput(date: Date, nextDraft: DayLogDraft): DayStatusLogInput {
    const dateKey = formatDateInput(date);
    const prompt = getPeriodPromptForDate(dateKey);
    const flowLevel =
      nextDraft.flow === "偏多"
        ? "heavy"
        : nextDraft.flow === "少量"
          ? "light"
          : nextDraft.flow === "正常"
            ? "medium"
            : undefined;

    return {
      date: dateKey,
      periodQuestion: prompt.question,
      periodAnswer: prompt.answer ?? "no",
      time: boundaryTime,
      flowLevel,
      symptoms: nextDraft.pain === "无痛" ? [] : [nextDraft.pain],
      mood: nextDraft.mood,
      notes: `${nextDraft.flow} · ${nextDraft.pain} · ${nextDraft.mood}`
    };
  }

  function updateDraft(nextDraft: DayLogDraft) {
    setDraft(nextDraft);

    if (!selectedDate) return;

    onSaveDayStatus(buildDayLogInput(selectedDate, nextDraft));
  }

  function handlePeriodAnswer(answer: PeriodAnswer) {
    if (!selectedDate) return;

    const dateKey = formatDateInput(selectedDate);
    const prompt = getPeriodPromptForDate(dateKey);
    const time = boundaryTime || currentTimeInput();
    setBoundaryTime(time);
    onAnswerPeriodPrompt(dateKey, prompt.question, answer, time);
  }

  function openDetailSheet(key: DetailStatusKey) {
    if (!selectedDate) {
      openDate(today);
    }
    setActiveDetailKey(key);
  }

  function saveDetailDraft(details: DayStatusDetails) {
    const targetDate = selectedDate ?? today;
    const dateKey = formatDateInput(targetDate);
    const existingLog = logsByDate.get(dateKey);
    const prompt = getPeriodPromptForDate(dateKey);
    const time = existingLog?.time || prompt.time || boundaryTime || currentTimeInput();
    const input: DayStatusLogInput = {
      date: dateKey,
      periodQuestion: prompt.question,
      periodAnswer: prompt.answer ?? existingLog?.periodAnswer ?? "no",
      time,
      details
    };

    if (activeDetailKey === "symptoms") {
      input.symptoms = details.symptoms ?? [];
    }

    onSaveDayStatus(input);
    setActiveDetailKey(null);
  }

  const selectedDateKey = selectedDate ? formatDateInput(selectedDate) : "";
  const selectedLog = selectedDate ? logsByDate.get(selectedDateKey) : undefined;
  const selectedPrompt = selectedDate ? getPeriodPromptForDate(selectedDateKey) : null;
  const openEndDate =
    selectedDate && selectedDate.getTime() > today.getTime() ? formatDateInput(selectedDate) : formatDateInput(today);
  const selectedTitle = selectedDate
    ? `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 ${formatWeekday(selectedDate)}`
    : "选择日期记录状态";
  const sheetDate = selectedDate ?? today;
  const sheetDateKey = formatDateInput(sheetDate);
  const sheetDateTitle = `${sheetDate.getMonth() + 1}月${sheetDate.getDate()}日 ${formatWeekday(sheetDate)}`;
  const sheetLog = logsByDate.get(sheetDateKey);

  return (
    <div className="relative min-h-full">
      <div
        data-testid="home-content"
        className={cn(
          "px-6 pb-4 pt-8 transition duration-300 ease-out",
          activeDetailKey && "scale-[0.97] blur-[3px]"
        )}
      >
      <header className="mb-6">
        <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.01em] text-[#1D1D1F]">
          卵泡期，第{summary.currentDay || 12}天
        </h1>
        <p className="mt-2 text-[15px] text-gray-500">小仙女， 上午好  ·  星期二</p>
      </header>

      <section className="mb-5 rounded-[30px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="mb-3 flex items-center gap-2 text-[#DFA4A9]">
          <Sparkles className="h-4 w-4" />
          <span className="text-[14px] font-medium">今日身体提示</span>
        </div>
        <p className="text-[15px] leading-7 text-gray-600">
          现在是卵泡期，雌激素水平正在上升。你的精力应该会逐渐充沛，皮肤状态也会变好。今天是适合运动和开启新计划的好时机哦。
        </p>
      </section>

      <section className="rounded-[34px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            aria-label="上一月"
            onClick={() => setVisibleMonth((current) => addCalendarMonths(current, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-[24px] font-semibold tracking-[-0.01em]">{monthTitle(visibleMonth)}</h2>
          <button
            type="button"
            aria-label="下一月"
            onClick={() => setVisibleMonth((current) => addCalendarMonths(current, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-[12px] font-medium text-gray-400">
          {WEEK_DAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map((calendarDay) => {
            const dateKey = formatDateInput(calendarDay.date);
            const dateLog = logsByDate.get(dateKey);
            const isCurrentDay = isSameDate(calendarDay.date, today);
            const predictedPeriod = !dateLog && isPredictedPeriodDate(calendarDay.date, summary, settings);
            const periodRole = periodRoleForDate(periods, calendarDay.date, openEndDate);
            const isSelected = selectedDate ? isSameDate(selectedDate, calendarDay.date) : false;
            const labelParts = [
              `${calendarDay.date.getMonth() + 1}月${calendarDay.day}日`,
              periodLabel(periodRole, dateLog),
              predictedPeriod ? "预测经期" : "",
              dateLog ? "已记录" : "",
              isCurrentDay ? "今天" : ""
            ].filter(Boolean);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => openDate(calendarDay.date)}
                aria-label={labelParts.join(" ")}
                className={cn(
                  "group relative mx-auto flex h-[66px] w-full flex-col items-center justify-start text-[15px] transition",
                  !calendarDay.currentMonth && "text-gray-300 opacity-60",
                  calendarDay.currentMonth && "text-[#1D1D1F]"
                )}
              >
                <span
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition",
                    calendarDay.currentMonth && !periodRole && !predictedPeriod && "group-hover:bg-gray-100",
                    periodRole && !isCurrentDay && "bg-[#F6D9DC] text-[#A85E67]",
                    predictedPeriod && "bg-[#F8EEF0] text-[#DFA4A9]",
                    isCurrentDay && "bg-[#1D1D1F] text-white",
                    isSelected && "ring-2 ring-[#E94D8A] ring-offset-2 ring-offset-white"
                  )}
                >
                  {calendarDay.day}
                </span>
                {dateLog ? (
                  <CalendarRecordIcons log={dateLog} />
                ) : (
                  <span className="h-3" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-[#F6D9DC]" />
            经期
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-[#1D1D1F]" />
            今天
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-[#F8EEF0]" />
            预测经期
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex items-center gap-0.5">
              <Droplets className="h-3 w-3 text-[#E94D8A]" />
              <HeartPulse className="h-3 w-3 text-[#F0A35E]" />
              <Smile className="h-3 w-3 text-[#F2B84B]" />
            </span>
            已记录
          </span>
        </div>
      </section>

      <section className="mt-4 rounded-[28px] bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="mb-2 flex items-center justify-between px-1 py-2">
          <div>
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{selectedTitle}</h2>
            <p className="mt-1 text-[12px] text-gray-400">
              {selectedLog ? "已记录，可继续调整" : selectedDate ? "还没有记录" : "点击日历日期后编辑"}
            </p>
          </div>
          <Moon className="h-5 w-5 text-[#DFA4A9]" />
        </div>

        <section className="mb-3 rounded-[24px] bg-gradient-to-br from-[#FFF4F6] to-white p-4 shadow-[inset_0_0_0_1px_rgba(223,164,169,0.22)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F6D9DC] text-[#A85E67]">
                <ToggleLeft className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-[20px] font-semibold tracking-[-0.01em]">
                  {selectedPrompt?.question === "end" ? "月经走喽" : "月经来了"}
                </h3>
                <p className="mt-0.5 text-[12px] text-gray-400">
                  {selectedPrompt?.answer === "yes"
                    ? "已记录为是，可点否撤销"
                    : selectedPrompt?.answer === "no"
                      ? "已确认不是"
                      : "选择后自动保存"}
                </p>
              </div>
            </div>
            <label className="flex shrink-0 flex-col text-[11px] font-medium text-gray-400">
              时间
              <input
                aria-label="记录时间"
                type="time"
                value={boundaryTime}
                onChange={(event) => setBoundaryTime(event.target.value)}
                className="mt-1 h-9 w-[88px] rounded-full border border-[#F0C9CF] bg-white px-2 text-[13px] font-semibold text-[#A85E67] outline-none focus:ring-2 focus:ring-[#E94D8A]/30"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PERIOD_OPTIONS.map((option) => {
              const answer: PeriodAnswer = option === "是" ? "yes" : "no";
              const isSelected = selectedPrompt?.answer === answer;

              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handlePeriodAnswer(answer)}
                  disabled={!selectedDate}
                  className={cn(
                    "h-12 rounded-full text-[15px] font-semibold transition disabled:opacity-50",
                    isSelected
                      ? "bg-[#E94D8A] text-white shadow-[0_10px_22px_rgba(233,77,138,0.24)]"
                      : "bg-white text-gray-500 shadow-[inset_0_0_0_1px_rgba(229,231,235,0.95)] hover:text-[#A85E67]"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>
        <StatusRow
          title="流量"
          icon={<Droplets className="h-4 w-4" />}
          options={FLOW_OPTIONS}
          selected={draft.flow}
          onSelect={(flow) => updateDraft({ ...draft, flow })}
        />
        <StatusRow
          title="痛经"
          icon={<Heart className="h-4 w-4" />}
          options={PAIN_OPTIONS}
          selected={draft.pain}
          onSelect={(pain) => updateDraft({ ...draft, pain })}
        />
        <StatusRow
          title="心情"
          icon={<Smile className="h-4 w-4" />}
          options={MOOD_OPTIONS}
          selected={draft.mood}
          onSelect={(mood) => updateDraft({ ...draft, mood })}
        />
        {DETAIL_STATUS_ROWS.map((row) => (
          <PassiveStatusRow
            key={row.key}
            title={row.title}
            icon={row.icon}
            onAdd={() => openDetailSheet(row.key)}
          />
        ))}
      </section>
      </div>

      {activeDetailKey ? (
        <>
          <button
            type="button"
            aria-label="关闭记录弹窗遮罩"
            onClick={() => setActiveDetailKey(null)}
            className="fixed inset-0 z-40 mx-auto w-full max-w-[430px] bg-black/12 backdrop-blur-[1px] sm:bottom-8"
          />
          <DayStatusSheet
            key={`${activeDetailKey}-${sheetDateKey}`}
            statusKey={activeDetailKey}
            dateTitle={sheetDateTitle}
            existingDetails={sheetLog?.details}
            onClose={() => setActiveDetailKey(null)}
            onConfirm={saveDetailDraft}
          />
        </>
      ) : null}
    </div>
  );
}
