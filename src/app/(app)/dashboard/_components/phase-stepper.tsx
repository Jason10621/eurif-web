import type { Phase } from "@/lib/types";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/utils";

export function PhaseStepper({
  phases,
  current,
}: {
  phases: Phase[];
  current: Phase | null;
}) {
  return (
    <div>
      <ol className="flex flex-wrap items-center gap-y-3">
        {phases.map((p, i) => {
          const isCurrent = current?.id === p.id;
          return (
            <li key={p.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 px-1">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition",
                    p.status === "done" &&
                      "border-status-done bg-status-done text-white",
                    p.status === "active" &&
                      "border-primary bg-primary text-primary-fg",
                    p.status === "planned" &&
                      "border-border-strong bg-surface text-muted",
                    isCurrent && "ring-4 ring-primary/20",
                  )}
                >
                  {p.status === "done" ? <Check className="h-4 w-4" /> : p.phase_no}
                </span>
                <span
                  className={cn(
                    "max-w-[72px] text-center text-[10px] leading-tight",
                    p.status === "planned" ? "text-muted" : "text-text-secondary",
                  )}
                >
                  {p.name}
                </span>
              </div>
              {i < phases.length - 1 && (
                <span
                  className={cn(
                    "mx-0.5 h-0.5 w-6 rounded-full sm:w-10",
                    p.status === "done" ? "bg-status-done" : "bg-border-strong",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {current && (
        <div className="mt-5 rounded-xl bg-surface-2 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            현재 단계 · Phase {current.phase_no}
          </div>
          <p className="mt-1 text-sm font-bold">{current.name}</p>
          {current.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
              {current.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${current.progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums">
              {current.progress}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            {fmtDate(current.start_date)} ~ {fmtDate(current.end_date)}
          </p>
        </div>
      )}
    </div>
  );
}
