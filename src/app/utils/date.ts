export function formatChineseDate(date: string | null | undefined): string {
  if (!date) return "暂无";
  const parsed = new Date(`${date}T00:00:00`);

  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}

export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}
