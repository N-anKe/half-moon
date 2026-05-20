import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Database,
  Ruler,
  ShieldCheck,
  Trash2,
  UserRound,
  Weight,
  X
} from "lucide-react";
import type { UserCycleSettings } from "../models/cycle";
import { logDebugError } from "../utils/debug";

interface ProfileTabProps {
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

export function ProfileTab({ settings, onClearCache }: ProfileTabProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

  function handleRequestClear() {
    setFeedback(null);
    setConfirmingClear(true);
  }

  function handleConfirmClear() {
    try {
      onClearCache();
      setConfirmingClear(false);
      setFeedback("success");
    } catch (error) {
      logDebugError("ProfileTab.handleConfirmClear", error);
      setConfirmingClear(false);
      setFeedback("error");
    }
  }

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
          aria-label="清除缓存"
          onClick={handleRequestClear}
          className="flex w-full items-center justify-between rounded-[24px] bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-400">
              <Trash2 className="h-5 w-5" />
            </span>
            <div>
            <p className="text-[15px] font-medium text-red-500">清除缓存</p>
            <p className="mt-1 text-[12px] text-gray-400">清空本地记录和设置</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </button>
        {feedback ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-[18px] bg-white px-4 py-3 text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.03)]"
          >
            <CheckCircle2
              className={`h-4 w-4 ${feedback === "success" ? "text-emerald-500" : "text-red-500"}`}
            />
            <span className={feedback === "success" ? "text-emerald-600" : "text-red-500"}>
              {feedback === "success" ? "删除成功" : "删除失败，请稍后重试"}
            </span>
          </div>
        ) : null}
        <p className="text-center text-[12px] text-gray-400">月半弯 Version 1.0.0</p>
      </section>

      {confirmingClear ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 px-6 pb-[calc(env(safe-area-inset-bottom)+96px)] backdrop-blur-sm sm:items-center sm:pb-0">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-cache-title"
            className="w-full max-w-[382px] rounded-[28px] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.16)]"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="clear-cache-title" className="text-[18px] font-semibold text-[#1D1D1F]">
                  确认清除缓存
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-gray-500">
                  会清空本机保存的经期记录、每日状态和周期设置，操作后无法撤销。
                </p>
              </div>
              <button
                type="button"
                aria-label="取消清除"
                onClick={() => setConfirmingClear(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="h-11 rounded-full bg-gray-100 text-[14px] font-semibold text-gray-500"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="h-11 rounded-full bg-red-500 text-[14px] font-semibold text-white shadow-[0_10px_22px_rgba(239,68,68,0.24)]"
              >
                确认清除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
