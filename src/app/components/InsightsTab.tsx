import { type ReactNode } from "react";
import { Activity, BarChart3, CalendarHeart, Droplets, TrendingUp } from "lucide-react";
import type { CycleSummary, PeriodRecord, UserCycleSettings } from "../models/cycle";

interface InsightsTabProps {
  summary: CycleSummary;
  records: PeriodRecord[];
  settings: UserCycleSettings;
}

const chartData = [
  { id: "d1", label: "1", value: 28 },
  { id: "d2", label: "2", value: 24 },
  { id: "d3", label: "3", value: 31 },
  { id: "d4", label: "4", value: 27 },
  { id: "d5", label: "5", value: 29 },
  { id: "d6", label: "6", value: 26 }
];

function StatCard({
  icon,
  label,
  value,
  detail
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#F8EEF0] text-[#DFA4A9]">
        {icon}
      </div>
      <p className="text-[13px] text-gray-400">{label}</p>
      <p className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">{value}</p>
      <p className="mt-1 text-[12px] text-gray-400">{detail}</p>
    </section>
  );
}

export function InsightsTab({ summary, records, settings }: InsightsTabProps) {
  return (
    <div className="px-6 pb-4 pt-8">
      <header className="mb-7">
        <h1 className="text-[34px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">周期分析</h1>
        <p className="mt-2 text-[15px] text-gray-500">根据最近记录生成趋势</p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="平均周期"
          value={`${settings.averageCycleLength}天`}
          detail="近 6 次估算"
        />
        <StatCard
          icon={<Droplets className="h-5 w-5" />}
          label="经期天数"
          value={`${settings.averagePeriodLength}天`}
          detail="默认档案"
        />
      </div>

      <section className="mb-4 rounded-[34px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-[#1D1D1F]">周期长度趋势</h2>
            <p className="mt-1 text-[13px] text-gray-400">Recharts 风格柱状图</p>
          </div>
          <BarChart3 className="h-5 w-5 text-[#DFA4A9]" />
        </div>
        <div className="flex h-44 items-end gap-3">
          {chartData.map((item) => (
            <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-[18px] bg-gradient-to-t from-[#DFA4A9] to-[#F6D9DC]"
                style={{ height: `${item.value * 4}px` }}
              />
              <span className="text-[11px] text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[34px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-center gap-2 text-[#DFA4A9]">
          <CalendarHeart className="h-4 w-4" />
          <h2 className="text-[15px] font-medium">预测摘要</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-[22px] bg-[#F8EEF0] px-4 py-3">
            <span className="text-[14px] text-gray-500">下次经期</span>
            <span className="text-[14px] font-semibold text-[#1D1D1F]">
              {summary.nextPeriodDate ?? "暂无"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-[22px] bg-gray-50 px-4 py-3">
            <span className="text-[14px] text-gray-500">已记录</span>
            <span className="text-[14px] font-semibold text-[#1D1D1F]">{records.length} 天</span>
          </div>
          <div className="flex items-center gap-3 rounded-[22px] bg-gray-50 px-4 py-3">
            <Activity className="h-4 w-4 text-[#DFA4A9]" />
            <p className="text-[13px] leading-5 text-gray-500">
              趋势数据越完整，预测越稳定。建议每天点击日历记录身体状态。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
