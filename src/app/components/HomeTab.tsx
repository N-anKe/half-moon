import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BookOpenText,
  Camera,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Droplets,
  Heart,
  Moon,
  Palette,
  Scale,
  Smile,
  Sparkles,
  Thermometer,
  ToggleLeft
} from "lucide-react";
import type { CycleSummary, PeriodRecord, PeriodRecordInput, UserCycleSettings } from "../models/cycle";
import { cn } from "./ui/utils";

interface HomeTabProps {
  summary: CycleSummary;
  records: PeriodRecord[];
  settings: UserCycleSettings;
  onSaveRecord: (input: PeriodRecordInput) => void;
}

interface DayLogDraft {
  flow: string;
  pain: string;
  mood: string;
}

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
const PASSIVE_STATUS_ROWS = [
  { title: "颜色", icon: <Palette className="h-4 w-4" /> },
  { title: "爱爱", icon: <Heart className="h-4 w-4" /> },
  { title: "症状", icon: <Camera className="h-4 w-4" /> },
  { title: "白带", icon: <Droplets className="h-4 w-4" /> },
  { title: "体温", icon: <Thermometer className="h-4 w-4" /> },
  { title: "体重", icon: <Scale className="h-4 w-4" /> },
  { title: "日记", icon: <BookOpenText className="h-4 w-4" /> },
  { title: "好习惯", icon: <Activity className="h-4 w-4" /> }
];

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

function recordMapByDate(records: PeriodRecord[]): Map<string, PeriodRecord> {
  return new Map(records.map((record) => [record.startDate, record]));
}

function hasPeriodFlow(record: PeriodRecord | undefined): boolean {
  return Boolean(record?.flowLevel);
}

function flowLabelFromRecord(record: PeriodRecord | undefined, fallback = "无"): string {
  if (record?.flowLevel === "light") return "少量";
  if (record?.flowLevel === "medium") return "正常";
  if (record?.flowLevel === "heavy") return "偏多";

  return fallback;
}

function draftFromRecord(record: PeriodRecord | undefined, fallback: DayLogDraft): DayLogDraft {
  if (!record) return fallback;

  return {
    flow: flowLabelFromRecord(record),
    pain: record.symptoms?.[0] ?? "无痛",
    mood: record.mood ?? "平静"
  };
}

function draftForNewDate(recordsByDate: Map<string, PeriodRecord>, date: Date): DayLogDraft {
  const previousRecord = recordsByDate.get(formatDateInput(addCalendarDays(date, -1)));

  return {
    flow: hasPeriodFlow(previousRecord) ? flowLabelFromRecord(previousRecord, "正常") : "无",
    pain: "无痛",
    mood: "平静"
  };
}

function periodRoleForDate(recordsByDate: Map<string, PeriodRecord>, date: Date): PeriodRangeRole | null {
  const currentKey = formatDateInput(date);
  if (!hasPeriodFlow(recordsByDate.get(currentKey))) return null;

  const previousKey = formatDateInput(addCalendarDays(date, -1));
  const nextKey = formatDateInput(addCalendarDays(date, 1));
  const hasPrevious = hasPeriodFlow(recordsByDate.get(previousKey));
  const hasNext = hasPeriodFlow(recordsByDate.get(nextKey));

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

function periodLabel(role: PeriodRangeRole | null, record: PeriodRecord | undefined): string {
  if (!role) return record ? "非经期" : "";
  if (role === "single") return "经期开始 经期结束";
  if (role === "start") return "经期开始";
  if (role === "middle") return "经期中";

  return "经期结束";
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

function PassiveStatusRow({ title, icon }: { title: string; icon: ReactNode }) {
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
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#D66D92] transition hover:bg-[#FDECEF]"
        aria-label={`添加${title}`}
      >
        <CirclePlus className="h-5 w-5" />
      </button>
    </div>
  );
}

export function HomeTab({ summary, records, settings, onSaveRecord }: HomeTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draft, setDraft] = useState<DayLogDraft>({
    flow: "无",
    pain: "无痛",
    mood: "平静"
  });
  const today = new Date(2026, 4, 19);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const calendarDays = useMemo(() => buildMonthCalendar(visibleMonth), [visibleMonth]);
  const recordsByDate = useMemo(() => recordMapByDate(records), [records]);

  function openDate(date: Date) {
    const existingRecord = recordsByDate.get(formatDateInput(date));
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setSelectedDate(date);
    setDraft(draftFromRecord(existingRecord, draftForNewDate(recordsByDate, date)));
  }

  function buildRecordInput(date: Date, nextDraft: DayLogDraft): PeriodRecordInput {
    const flowLevel =
      nextDraft.flow === "偏多"
        ? "heavy"
        : nextDraft.flow === "少量"
          ? "light"
          : nextDraft.flow === "正常"
            ? "medium"
            : undefined;

    return {
      startDate: formatDateInput(date),
      flowLevel,
      symptoms: nextDraft.pain === "无痛" ? [] : [nextDraft.pain],
      mood: nextDraft.mood,
      notes: `${nextDraft.flow} · ${nextDraft.pain} · ${nextDraft.mood}`
    };
  }

  function updateDraft(nextDraft: DayLogDraft) {
    setDraft(nextDraft);

    if (!selectedDate) return;

    onSaveRecord(buildRecordInput(selectedDate, nextDraft));
  }

  const selectedRecord = selectedDate ? recordsByDate.get(formatDateInput(selectedDate)) : undefined;
  const selectedTitle = selectedDate
    ? `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 ${formatWeekday(selectedDate)}`
    : "选择日期记录状态";

  return (
    <div className="px-6 pb-4 pt-8">
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
            const dateRecord = recordsByDate.get(dateKey);
            const isCurrentDay = isSameDate(calendarDay.date, today);
            const predictedPeriod = !dateRecord && isPredictedPeriodDate(calendarDay.date, summary, settings);
            const periodRole = periodRoleForDate(recordsByDate, calendarDay.date);
            const isSelected = selectedDate ? isSameDate(selectedDate, calendarDay.date) : false;
            const labelParts = [
              `${calendarDay.date.getMonth() + 1}月${calendarDay.day}日`,
              periodLabel(periodRole, dateRecord),
              predictedPeriod ? "预测经期" : "",
              dateRecord ? "已记录" : "",
              isCurrentDay ? "今天" : ""
            ].filter(Boolean);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => openDate(calendarDay.date)}
                aria-label={labelParts.join(" ")}
                className={cn(
                  "group relative mx-auto flex h-[58px] w-full flex-col items-center justify-start text-[15px] transition",
                  !calendarDay.currentMonth && "text-gray-300 opacity-60",
                  calendarDay.currentMonth && "text-[#1D1D1F]"
                )}
              >
                {periodRole ? (
                  <span
                    className={cn(
                      "absolute left-0 right-0 top-1 h-10 bg-[#F6D9DC]",
                      periodRole === "single" && "left-1/2 right-auto w-10 -translate-x-1/2 rounded-full",
                      periodRole === "start" && "left-1/2 rounded-l-full",
                      periodRole === "middle" && "rounded-none",
                      periodRole === "end" && "right-1/2 rounded-r-full"
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-full transition",
                    calendarDay.currentMonth && !periodRole && !predictedPeriod && "group-hover:bg-gray-100",
                    periodRole && !isCurrentDay && "text-[#A85E67]",
                    predictedPeriod && "bg-[#F8EEF0] text-[#DFA4A9]",
                    isCurrentDay && "bg-[#1D1D1F] text-white",
                    isSelected && "ring-2 ring-[#E94D8A] ring-offset-2 ring-offset-white"
                  )}
                >
                  {calendarDay.day}
                </span>
                {dateRecord ? (
                  <span className="-mt-1 flex h-3 gap-0.5 text-[8px]" aria-label="已记录">
                    {dateRecord.flowLevel ? "💧" : null}
                    {dateRecord.symptoms?.length ? "❤️" : null}
                    {dateRecord.mood ? "😊" : null}
                  </span>
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
            <span>💧❤️😊</span>
            已记录
          </span>
        </div>
      </section>

      <section className="mt-4 rounded-[28px] bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="mb-2 flex items-center justify-between px-1 py-2">
          <div>
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{selectedTitle}</h2>
            <p className="mt-1 text-[12px] text-gray-400">
              {selectedRecord ? "已记录，可继续调整" : selectedDate ? "还没有记录" : "点击日历日期后编辑"}
            </p>
          </div>
          <Moon className="h-5 w-5 text-[#DFA4A9]" />
        </div>

        <StatusRow
          title="月经走喽"
          icon={<ToggleLeft className="h-4 w-4" />}
          options={PERIOD_OPTIONS}
          selected={draft.flow === "无" ? "否" : "是"}
          onSelect={(period) => {
            updateDraft({
              ...draft,
              flow: period === "是" && draft.flow === "无" ? "正常" : period === "否" ? "无" : draft.flow
            });
          }}
        />
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
        {PASSIVE_STATUS_ROWS.map((row) => (
          <PassiveStatusRow key={row.title} title={row.title} icon={row.icon} />
        ))}
      </section>
    </div>
  );
}
