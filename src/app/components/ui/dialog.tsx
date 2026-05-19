import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Dialog({ open, title, children, onClose }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-rose-950/30 px-4 pb-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[430px] rounded-[30px] bg-background p-5 shadow-soft"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="关闭" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
