import { useMemo, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { HomeTab } from "./components/HomeTab";
import { InsightsTab } from "./components/InsightsTab";
import { ProfileTab } from "./components/ProfileTab";
import type {
  DayStatusLogInput,
  PeriodAnswer,
  PeriodQuestion,
  SaveSettingsOptions,
  PeriodServiceSnapshot
} from "./models/cycle";
import { createPeriodService, LocalPeriodRepository } from "./services/cycle";

export type TabKey = "home" | "insights" | "profile";

export default function App() {
  const service = useMemo(() => createPeriodService(new LocalPeriodRepository()), []);
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [snapshot, setSnapshot] = useState<PeriodServiceSnapshot>(() => service.getSnapshot());

  function handleSaveDayStatus(input: DayStatusLogInput) {
    setSnapshot(service.saveDayStatusLog(input));
  }

  function handleAnswerPeriodPrompt(
    date: string,
    question: PeriodQuestion,
    answer: PeriodAnswer,
    time: string
  ) {
    setSnapshot(service.answerPeriodPrompt(date, question, answer, time));
  }

  function handleSaveSettings(
    settings: PeriodServiceSnapshot["settings"],
    options?: SaveSettingsOptions
  ) {
    setSnapshot(service.saveSettings(settings, options));
  }

  return (
    <main className="flex min-h-dvh justify-center bg-gray-100 font-sans text-[#1D1D1F] selection:bg-rose-200 sm:p-6 md:p-8">
      <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#F5F5F7] shadow-[0_20px_60px_rgba(0,0,0,0.1)] sm:min-h-[860px] sm:rounded-[48px] sm:border sm:border-gray-200/50">
        <div className="flex-1 overflow-y-auto pb-32 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activeTab === "home" ? (
          <HomeTab
            dayLogs={snapshot.dayLogs}
            periods={snapshot.periods}
            settings={snapshot.settings}
            summary={snapshot.summary}
            getPeriodPromptForDate={service.getPeriodPromptForDate}
            onAnswerPeriodPrompt={handleAnswerPeriodPrompt}
            onSaveDayStatus={handleSaveDayStatus}
          />
        ) : null}
        {activeTab === "insights" ? (
          <InsightsTab
            insights={snapshot.insights}
            summary={snapshot.summary}
          />
        ) : null}
        {activeTab === "profile" ? (
          <ProfileTab
            settings={snapshot.settings}
            onSaveSettings={handleSaveSettings}
            onClearCache={() => {
              localStorage.clear();
              setSnapshot(service.getSnapshot());
            }}
          />
        ) : null}
        </div>
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </main>
  );
}
