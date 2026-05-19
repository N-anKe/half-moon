import { FormEvent, useState } from "react";
import type { FlowLevel, PeriodRecordInput } from "../models/cycle";
import { todayInputValue } from "../utils/date";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "./ui/utils";

interface RecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: PeriodRecordInput) => void;
}

const flowOptions: Array<{ value: FlowLevel; label: string }> = [
  { value: "light", label: "少量" },
  { value: "medium", label: "正常" },
  { value: "heavy", label: "偏多" }
];

export function RecordDialog({ open, onClose, onSave }: RecordDialogProps) {
  const [startDate, setStartDate] = useState(todayInputValue());
  const [endDate, setEndDate] = useState("");
  const [flowLevel, setFlowLevel] = useState<FlowLevel>("medium");
  const [notes, setNotes] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      startDate,
      endDate: endDate || undefined,
      flowLevel,
      notes: notes.trim() || undefined,
      symptoms: [],
      mood: "calm"
    });
    onClose();
  }

  return (
    <Dialog open={open} title="记录经期" onClose={onClose}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="period-start">开始日期</Label>
            <Input
              id="period-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="period-end">结束日期</Label>
            <Input
              id="period-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>流量</Label>
          <div className="grid grid-cols-3 gap-2">
            {flowOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFlowLevel(option.value)}
                className={cn(
                  "h-10 rounded-full border text-sm transition",
                  flowLevel === option.value
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="period-notes">备注</Label>
          <Input
            id="period-notes"
            value={notes}
            placeholder="身体感受、疼痛、睡眠..."
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full">
          保存记录
        </Button>
      </form>
    </Dialog>
  );
}
