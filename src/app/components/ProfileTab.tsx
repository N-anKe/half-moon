import { useState, type FormEvent, type ReactNode } from "react";
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
import type { SaveSettingsOptions, UserCycleSettings } from "../models/cycle";
import { logDebugError } from "../utils/debug";

interface ProfileTabProps {
  settings: UserCycleSettings;
  onSaveSettings: (settings: UserCycleSettings, options?: SaveSettingsOptions) => void;
  onClearCache: () => void;
}

type ProfileFieldKey = "age" | "heightCm" | "weightKg" | "averageCycleLength" | "averagePeriodLength";

interface ProfileFieldConfig {
  key: ProfileFieldKey;
  label: string;
  unit: string;
  step: string;
  icon: ReactNode;
}

const PROFILE_FIELDS: ProfileFieldConfig[] = [
  { key: "age", label: "年龄", unit: "岁", step: "1", icon: <UserRound className="h-5 w-5" /> },
  { key: "heightCm", label: "身高", unit: "cm", step: "1", icon: <Ruler className="h-5 w-5" /> },
  { key: "weightKg", label: "体重", unit: "kg", step: "0.1", icon: <Weight className="h-5 w-5" /> },
  {
    key: "averageCycleLength",
    label: "平均周期长度",
    unit: "天",
    step: "1",
    icon: <Database className="h-5 w-5" />
  },
  {
    key: "averagePeriodLength",
    label: "经期天数",
    unit: "天",
    step: "1",
    icon: <ShieldCheck className="h-5 w-5" />
  }
];

function formatProfileValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ProfileRow({
  icon,
  label,
  value,
  onClick
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`编辑${label}`}
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-[24px] bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.03)]"
    >
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

function ProfileEditSheet({
  field,
  value,
  onClose,
  onSave
}: {
  field: ProfileFieldConfig;
  value: number;
  onClose: () => void;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(formatProfileValue(value));
  const dialogTitle = `编辑${field.label}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextValue = Number(draft);
    if (!Number.isFinite(nextValue) || nextValue <= 0) return;

    onSave(nextValue);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 px-6 pb-[calc(env(safe-area-inset-bottom)+96px)] backdrop-blur-sm sm:items-center sm:pb-0">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={dialogTitle}
        className="w-full max-w-[382px] rounded-[28px] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.16)]"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-semibold text-[#1D1D1F]">{dialogTitle}</h2>
            <p className="mt-2 text-[13px] leading-6 text-gray-500">
              保存后会同步到本地身体数据档案。
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭档案编辑"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-[13px] font-semibold text-gray-500">
            {field.label}
            <input
              aria-label={field.label}
              type="number"
              inputMode="decimal"
              min="0"
              step={field.step}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="h-14 w-full rounded-[22px] border border-gray-100 bg-gray-50 px-4 text-[22px] font-semibold text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#E94D8A]/20"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-full bg-gray-100 text-[14px] font-semibold text-gray-500"
            >
              取消
            </button>
            <button
              type="submit"
              className="h-11 rounded-full bg-[#1D1D1F] text-[14px] font-semibold text-white shadow-[0_10px_22px_rgba(29,29,31,0.18)]"
            >
              保存档案
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function ProfileTab({ settings, onSaveSettings, onClearCache }: ProfileTabProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [editingField, setEditingField] = useState<ProfileFieldConfig | null>(null);

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

  function handleSaveField(field: ProfileFieldConfig, value: number) {
    try {
      const nextSettings = {
        ...settings,
        [field.key]: value
      };
      const options = field.key === "weightKg" ? { syncWeightToToday: true } : undefined;

      onSaveSettings(nextSettings, options);
      setEditingField(null);
      setFeedback(null);
    } catch (error) {
      logDebugError("ProfileTab.handleSaveField", error, { field: field.key, value });
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
          {PROFILE_FIELDS.map((field) => (
            <ProfileRow
              key={field.key}
              icon={field.icon}
              label={field.label}
              value={`${formatProfileValue(settings[field.key])} ${field.unit}`}
              onClick={() => setEditingField(field)}
            />
          ))}
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

      {editingField ? (
        <ProfileEditSheet
          field={editingField}
          value={settings[editingField.key]}
          onClose={() => setEditingField(null)}
          onSave={(value) => handleSaveField(editingField, value)}
        />
      ) : null}
    </div>
  );
}
