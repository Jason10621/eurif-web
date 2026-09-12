import type { Phase } from "@/lib/types";
import { fmtDate, nowMs } from "@/lib/utils";

const MS = 86400000;

const statusLabel: Record<Phase["status"], string> = {
  done: "완료",
  active: "진행 중",
  planned: "예정",
};
const barColor: Record<Phase["status"], string> = {
  done: "var(--status-done)",
  active: "var(--primary)",
  planned: "var(--surface-3)",
};

export function PhaseGantt({ phases }: { phases: Phase[] }) {
  const dated = phases.filter((p) => p.start_date && p.end_date);
  if (dated.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        단계 일정 데이터가 부족합니다.
      </p>
    );
  }

  const starts = dated.map((p) => new Date(p.start_date!).getTime());
  const ends = dated.map((p) => new Date(p.end_date!).getTime());
  const rangeStart = Math.min(...starts);
  const rangeEnd = Math.max(...ends);
  const span = Math.max(rangeEnd - rangeStart, MS);

  const pos = (t: number) => ((t - rangeStart) / span) * 100;
  const today = nowMs();
  const todayPct = pos(today);
  const showToday = today >= rangeStart && today <= rangeEnd;

  // month gridlines
  const months: { pct: number; label: string }[] = [];
  const cursor = new Date(rangeStart);
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() < rangeEnd) {
    months.push({
      pct: pos(cursor.getTime()),
      label: `${cursor.getMonth() + 1}월`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div>
      {/* month axis */}
      <div className="relative mb-2 ml-[132px] h-4 text-[11px] text-muted">
        {months.map((m) => (
          <span
            key={m.label}
            className="absolute -translate-x-1/2"
            style={{ left: `${m.pct}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="relative space-y-2.5">
        {/* month gridlines + today marker span the rows */}
        <div className="pointer-events-none absolute inset-0 ml-[132px]">
          {months.map((m) => (
            <div
              key={m.label}
              className="absolute top-0 bottom-0 w-px bg-border"
              style={{ left: `${m.pct}%` }}
            />
          ))}
          {showToday && (
            <div
              className="absolute top-0 bottom-0 z-10 w-px bg-status-critical"
              style={{ left: `${todayPct}%` }}
            >
              <span className="absolute -top-0 left-1 whitespace-nowrap text-[10px] font-semibold text-status-critical">
                오늘
              </span>
            </div>
          )}
        </div>

        {dated.map((p) => {
          const s = new Date(p.start_date!).getTime();
          const e = new Date(p.end_date!).getTime();
          const left = pos(s);
          const width = Math.max(pos(e) - left, 1.5);
          return (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-[120px] shrink-0 text-right">
                <div className="truncate text-xs font-semibold">
                  P{p.phase_no}. {p.name}
                </div>
              </div>
              <div className="relative h-7 flex-1">
                <div
                  className="absolute top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-md"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background:
                      p.status === "planned" ? "var(--surface-3)" : "transparent",
                    border:
                      p.status === "planned"
                        ? "1px dashed var(--border-strong)"
                        : "none",
                  }}
                  title={`${p.name} · ${fmtDate(p.start_date)} ~ ${fmtDate(p.end_date)} · ${statusLabel[p.status]} ${p.progress}%`}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${p.status === "done" ? 100 : p.progress}%`,
                      background: barColor[p.status],
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3">
        {(["done", "active", "planned"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: barColor[s] }}
            />
            {statusLabel[s]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2.5 w-px bg-status-critical" />
          오늘
        </span>
      </div>
    </div>
  );
}
