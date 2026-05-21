import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import App from "./App";

describe("Half Moon app", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function seedPeriods(periods: Array<Record<string, unknown>>) {
    localStorage.setItem(
      "half-moon.cycle-periods",
      JSON.stringify(
        periods.map((period, index) => ({
          id: `period-${index + 1}`,
          startDate: "2026-05-10",
          startTime: "08:30",
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:00.000Z",
          ...period
        }))
      )
    );
  }

  function seedDayLogs(logs: Array<Record<string, unknown>>) {
    localStorage.setItem(
      "half-moon.day-status-logs",
      JSON.stringify(
        logs.map((log, index) => ({
          id: `log-${index + 1}`,
          date: "2026-05-10",
          periodQuestion: "start",
          periodAnswer: "yes",
          time: "08:30",
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:00.000Z",
          ...log
        }))
      )
    );
  }

  function seedSettings(settings: Record<string, unknown>) {
    localStorage.setItem("half-moon.cycle-settings", JSON.stringify(settings));
  }

  test("switches between bottom navigation tabs", async () => {
    const user = userEvent.setup();
    render(<App />);
    const bottomNav = screen.getByRole("navigation", { name: "底部导航" });

    expect(bottomNav).toHaveClass("fixed");
    expect(bottomNav.firstElementChild).toHaveClass("liquid-glass-nav");

    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(screen.getByText("周期分析")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "我的" }));

    expect(screen.getByText("身体数据档案")).toBeInTheDocument();
  });

  test("asks for confirmation before clearing local cache and shows success feedback", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      "half-moon.day-status-logs",
      JSON.stringify([
        {
          id: "log-1",
          date: "2026-05-10",
          periodQuestion: "start",
          periodAnswer: "no",
          time: "09:00",
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:00.000Z"
        }
      ])
    );
    render(<App />);

    await user.click(screen.getByRole("button", { name: "我的" }));

    expect(screen.queryByText(/条记录/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "清除缓存" }));

    expect(screen.getByRole("dialog", { name: "确认清除缓存" })).toBeInTheDocument();
    expect(localStorage.getItem("half-moon.day-status-logs")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "确认清除" }));

    expect(localStorage.getItem("half-moon.day-status-logs")).toBeNull();
    expect(screen.getByText("删除成功")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "确认清除缓存" })).not.toBeInTheDocument();
  });

  test("renders profile data from saved settings", async () => {
    const user = userEvent.setup();
    seedSettings({
      averageCycleLength: 30,
      averagePeriodLength: 6,
      age: 29,
      heightCm: 170,
      weightKg: 56.5
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "我的" }));

    expect(screen.getByText("29 岁")).toBeInTheDocument();
    expect(screen.getByText("170 cm")).toBeInTheDocument();
    expect(screen.getByText("56.5 kg")).toBeInTheDocument();
    expect(screen.getByText("30 天")).toBeInTheDocument();
    expect(screen.getByText("6 天")).toBeInTheDocument();
  });

  test("edits profile weight and persists it to settings and today's day log", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "我的" }));
    await user.click(screen.getByRole("button", { name: /体重/ }));

    expect(screen.getByRole("dialog", { name: "编辑体重" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("体重"));
    await user.type(screen.getByLabelText("体重"), "54.6");
    await user.click(screen.getByRole("button", { name: "保存档案" }));

    expect(screen.getByText("54.6 kg")).toBeInTheDocument();
    expect(localStorage.getItem("half-moon.cycle-settings")).toContain("\"weightKg\":54.6");
    expect(localStorage.getItem("half-moon.day-status-logs")).toContain("\"weight\":54.6");
  });

  test("syncs a home weight detail into the profile tab", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "添加体重" }));
    await user.clear(screen.getByLabelText("体重数值"));
    await user.type(screen.getByLabelText("体重数值"), "56.1");
    await user.click(screen.getByRole("button", { name: "保存记录详情" }));
    await user.click(screen.getByRole("button", { name: "我的" }));

    expect(screen.getByText("56.1 kg")).toBeInTheDocument();
  });

  test("editing average cycle length updates the next period prediction", async () => {
    const user = userEvent.setup();
    seedPeriods([{ startDate: "2026-05-10", endDate: "2026-05-14" }]);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "我的" }));
    await user.click(screen.getByRole("button", { name: /平均周期长度/ }));
    await user.clear(screen.getByLabelText("平均周期长度"));
    await user.type(screen.getByLabelText("平均周期长度"), "31");
    await user.click(screen.getByRole("button", { name: "保存档案" }));
    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(screen.getByText("2026-06-10")).toBeInTheDocument();
  });

  test("automatically saves a day status log when a selected date status changes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /5月10日/ }));
    expect(screen.getByText("5月10日 星期日")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存记录" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "正常" }));
    await user.click(screen.getByRole("button", { name: "轻微" }));

    expect(localStorage.getItem("half-moon.day-status-logs")).toContain("2026-05-10");
    expect(localStorage.getItem("half-moon.day-status-logs")).toContain("轻微");
    expect(JSON.parse(localStorage.getItem("half-moon.day-status-logs") ?? "[]")).toHaveLength(1);
  });

  test("opens a bottom sheet from an add button and only saves details after confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "添加体温" }));

    const sheet = screen.getByRole("dialog", { name: "记录体温" });
    expect(sheet).toHaveClass("h-[75dvh]");
    expect(within(sheet).getByText("5月19日 星期二")).toBeInTheDocument();
    expect(screen.getByTestId("home-content")).toHaveClass("scale-[0.97]");

    await user.clear(screen.getByLabelText("体温数值"));
    await user.type(screen.getByLabelText("体温数值"), "36.7");
    await user.click(screen.getByRole("button", { name: "关闭记录弹窗" }));

    expect(screen.queryByRole("dialog", { name: "记录体温" })).not.toBeInTheDocument();
    expect(localStorage.getItem("half-moon.day-status-logs")).toBeNull();

    await user.click(screen.getByRole("button", { name: "添加体温" }));
    await user.clear(screen.getByLabelText("体温数值"));
    await user.type(screen.getByLabelText("体温数值"), "36.8");
    await user.click(screen.getByRole("button", { name: "保存记录详情" }));

    expect(localStorage.getItem("half-moon.day-status-logs")).toContain("\"temperature\":36.8");
  });

  test("renders calendar record markers with degree-aware lucide icons instead of emoji", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /5月10日/ }));
    await user.click(screen.getByRole("button", { name: "正常" }));
    await user.click(screen.getByRole("button", { name: "轻微" }));

    expect(screen.getByLabelText("流量 正常")).toBeInTheDocument();
    expect(screen.getByLabelText("痛经 轻微")).toBeInTheDocument();
    expect(screen.getByLabelText("心情 平静")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5月10日/ })).toHaveClass("h-[66px]");
    expect(screen.getByLabelText("已记录")).not.toHaveClass("-mt-1");
    expect(screen.queryByText("💧")).not.toBeInTheDocument();
    expect(screen.queryByText("❤️")).not.toBeInTheDocument();
    expect(screen.queryByText("😊")).not.toBeInTheDocument();
  });

  test("switches calendar months with previous and next controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "下一月" }));

    expect(screen.getByText("2026年 6月")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /6月1日/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "上一月" }));

    expect(screen.getByText("2026年 5月")).toBeInTheDocument();
  });

  test("renders continuous period ranges from saved cycle periods and separate day logs", () => {
    seedPeriods([{ startDate: "2026-05-10", endDate: "2026-05-12" }]);
    seedDayLogs([
      { date: "2026-05-10", flowLevel: "medium", mood: "平静" },
      { date: "2026-05-11", flowLevel: "medium", mood: "平静", periodQuestion: "end", periodAnswer: "no" },
      { date: "2026-05-12", flowLevel: "medium", mood: "平静", periodQuestion: "end" },
      { date: "2026-05-13", periodAnswer: "no", mood: "平静" }
    ]);

    render(<App />);

    expect(screen.getByRole("button", { name: /5月10日 经期开始/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5月11日 经期中/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5月12日 经期结束/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5月13日 非经期/ })).toBeInTheDocument();
  });

  test("syncs insights with saved cycle periods and day logs", async () => {
    const user = userEvent.setup();
    seedPeriods([
      { id: "period-3", startDate: "2026-05-08", endDate: "2026-05-12" },
      { id: "period-2", startDate: "2026-04-10", endDate: "2026-04-15" },
      { id: "period-1", startDate: "2026-03-13", endDate: "2026-03-17" }
    ]);
    seedDayLogs([
      { id: "log-1", date: "2026-05-08" },
      { id: "log-2", date: "2026-05-08", periodQuestion: "end" },
      { id: "log-3", date: "2026-05-09" }
    ]);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(screen.getByText("28天")).toBeInTheDocument();
    expect(screen.getByText("5.3天")).toBeInTheDocument();
    expect(screen.getByText("2 天")).toBeInTheDocument();
    expect(screen.getByText("4/10")).toBeInTheDocument();
    expect(screen.getByText("5/8")).toBeInTheDocument();
  });

  test("shows an empty trend state when there is not enough cycle data", async () => {
    const user = userEvent.setup();
    seedPeriods([{ startDate: "2026-05-10" }]);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(screen.getByText("记录至少两次经期后生成趋势")).toBeInTheDocument();
    expect(screen.queryByText("Recharts 风格柱状图")).not.toBeInTheDocument();
  });

  test("promotes the period boundary prompt with a default time", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /5月10日/ }));

    expect(screen.getByText("月经来了")).toBeInTheDocument();
    const timeInput = screen.getByLabelText("记录时间") as HTMLInputElement;
    expect(timeInput.value).toMatch(/^\d{2}:\d{2}$/);

    await user.click(screen.getByRole("button", { name: "是" }));

    expect(screen.getByRole("button", { name: /5月10日 经期开始/ })).toBeInTheDocument();
    expect(localStorage.getItem("half-moon.cycle-periods")).toContain("2026-05-10");
    expect(localStorage.getItem("half-moon.day-status-logs")).toContain("\"periodAnswer\":\"yes\"");
  });

  test("shows the end prompt after a period starts and closes the inclusive calendar range", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      "half-moon.cycle-periods",
      JSON.stringify([
        {
          id: "period-1",
          startDate: "2026-05-10",
          startTime: "08:30",
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:00.000Z"
        }
      ])
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: /5月14日/ }));

    expect(screen.getByText("月经走喽")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "是" }));

    expect(screen.getByRole("button", { name: /5月10日 经期开始/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5月14日 经期结束/ })).toBeInTheDocument();
    expect(localStorage.getItem("half-moon.cycle-periods")).toContain("\"endDate\":\"2026-05-14\"");
  });
});
