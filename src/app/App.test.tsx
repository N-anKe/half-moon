import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import App from "./App";

describe("Half Moon app", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function seedRecords(records: Array<Record<string, unknown>>) {
    localStorage.setItem(
      "half-moon.period-records",
      JSON.stringify(
        records.map((record, index) => ({
          id: `record-${index + 1}`,
          startDate: "2026-05-10",
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:00.000Z",
          ...record
        }))
      )
    );
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

  test("automatically saves a period record when a selected date status changes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /5月10日/ }));
    expect(screen.getByText("5月10日 星期日")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存记录" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "正常" }));
    await user.click(screen.getByRole("button", { name: "轻微" }));

    expect(screen.getByText("卵泡期，第10天")).toBeInTheDocument();
    expect(localStorage.getItem("half-moon.period-records")).toContain("2026-05-10");
    expect(localStorage.getItem("half-moon.period-records")).toContain("轻微");
    expect(JSON.parse(localStorage.getItem("half-moon.period-records") ?? "[]")).toHaveLength(1);
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

  test("renders continuous period ranges from saved records and stops at a no-period day", () => {
    seedRecords([
      { startDate: "2026-05-10", flowLevel: "medium", mood: "平静" },
      { startDate: "2026-05-11", flowLevel: "medium", mood: "平静" },
      { startDate: "2026-05-12", flowLevel: "medium", mood: "平静" },
      { startDate: "2026-05-13", mood: "平静" }
    ]);

    render(<App />);

    expect(screen.getByRole("button", { name: /5月10日 经期开始/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5月11日 经期中/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5月12日 经期结束/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5月13日 非经期/ })).toBeInTheDocument();
  });

  test("inherits the previous day period status without creating a record until changed", async () => {
    const user = userEvent.setup();
    seedRecords([{ startDate: "2026-05-10", flowLevel: "medium", mood: "平静" }]);
    render(<App />);

    await user.click(screen.getByRole("button", { name: /5月11日/ }));

    expect(screen.getByRole("button", { name: "是", pressed: true })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("half-moon.period-records") ?? "[]")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "轻微" }));

    expect(JSON.parse(localStorage.getItem("half-moon.period-records") ?? "[]")).toHaveLength(2);
    expect(localStorage.getItem("half-moon.period-records")).toContain("2026-05-11");
  });
});
