import { type ReactNode } from "react";
import { ChevronRight, Database, Ruler, ShieldCheck, UserRound, Weight } from "lucide-react";
import type { PeriodRecord, UserCycleSettings } from "../models/cycle";

interface ProfileTabProps {
  records: PeriodRecord[];
  settings: UserCycleSettings;
  onClearCache: () => void;
}

function ProfileRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <button className="flex w-full items-center justify-between rounded-[24px] bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8EEF0] text-[#DFA4A9]">
          {icon}
        </div>
        <span className="text-[15px] font-medium text-[#1D1D1F]">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-[14px] text-gray-400">
        <span>{value}</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

export function ProfileTab({ records, settings, onClearCache }: ProfileTabProps) {
  return (
    <div className="px-6 pb-4 pt-8">
      <header className="mb-7">
        <h1 className="text-[34px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">我的</h1>
      </header>

      <section className="mb-6 rounded-[34px] bg-white p-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#F6D9DC] to-[#DFA4A9] text-white shadow-lg">
          <UserRound className="h-11 w-11" />
        </div>
        <h2 className="text-[24px] font-semibold text-[#1D1D1F]">小仙女</h2>
        <p className="mt-1 text-[14px] text-gray-400">温柔记录身体节律</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 px-1 text-[17px] font-semibold text-[#1D1D1F]">身体数据档案</h2>
        <div className="space-y-3">
          <ProfileRow icon={<UserRound className="h-5 w-5" />} label="年龄" value="26 岁" />
          <ProfileRow icon={<Ruler className="h-5 w-5" />} label="身高" value="165 cm" />
          <ProfileRow icon={<Weight className="h-5 w-5" />} label="体重" value="52 kg" />
          <ProfileRow icon={<Database className="h-5 w-5" />} label="平均周期长度" value={`${settings.averageCycleLength} 天`} />
          <ProfileRow icon={<ShieldCheck className="h-5 w-5" />} label="经期天数" value={`${settings.averagePeriodLength} 天`} />
        </div>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={onClearCache}
          className="flex w-full items-center justify-between rounded-[24px] bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.03)]"
        >
          <div>
            <p className="text-[15px] font-medium text-red-500">清除缓存</p>
            <p className="mt-1 text-[12px] text-gray-400">清空本地记录和设置</p>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-[12px] text-red-400">
            {records.length} 条记录
          </span>
        </button>
        <p className="text-center text-[12px] text-gray-400">月半弯 Version 1.0.0</p>
      </section>
    </div>
  );
}
