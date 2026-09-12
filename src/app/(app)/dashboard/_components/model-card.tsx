import type { AnalysisResult } from "@/lib/types";

export function ModelCard({ analysis }: { analysis: AnalysisResult[] }) {
  const byVar = (needle: string) =>
    analysis.find((a) => a.variable.includes(needle));

  const bl = byVar("블루라이트");
  const caf = byVar("카페인");
  const debt = byVar("부채");
  const anyFinal = analysis.some((a) => a.is_final);

  const terms = [
    { c: "var(--chart-1)", b: bl?.beta, x: "블루라이트 노출" },
    { c: "var(--chart-2)", b: caf?.beta, x: "카페인 잔류" },
    { c: "var(--chart-3)", b: debt?.beta, x: "수면 부채" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-surface-2 p-4">
        <p className="font-mono text-sm leading-7">
          <span className="text-muted">Y</span> ={" "}
          <span className="text-muted">β₀</span>
          {terms.map((t, i) => (
            <span key={i}>
              {" + "}
              <span style={{ color: t.c }} className="font-semibold">
                {t.b != null ? Number(t.b) : `β${i + 1}`}
              </span>
              <span className="text-muted">·</span>
              <span className="text-text-secondary">({t.x})</span>
            </span>
          ))}
          {" + "}
          <span className="text-muted">ε</span>
        </p>
        <p className="mt-2 text-[11px] text-muted">
          Y = 수면 위상 지연량(분) = 당일 취침 시각 − 개인 기준 취침 시각
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {terms.map((t, i) => (
          <div key={i} className="rounded-lg border border-border p-2.5">
            <dt className="text-[11px] text-muted">{t.x}</dt>
            <dd
              className="mt-0.5 text-lg font-bold tabular-nums"
              style={{ color: t.c }}
            >
              {t.b != null ? Number(t.b) : "—"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-lg border border-dashed border-border-strong p-3">
        <p className="text-[11px] font-semibold text-text-secondary">
          카페인 혈중 잔류 곡선
        </p>
        <p className="mt-1 font-mono text-xs text-muted">
          C(t) = C₀ × (½)^(t / 5.5h)
        </p>
      </div>

      <p className="text-[11px] text-muted">
        {anyFinal
          ? "실제 회귀 분석 결과입니다."
          : "※ 선행 연구 기반 예상 계수입니다. 데이터 수집·분석(Phase 5) 후 실제 값으로 갱신됩니다."}
      </p>
    </div>
  );
}
