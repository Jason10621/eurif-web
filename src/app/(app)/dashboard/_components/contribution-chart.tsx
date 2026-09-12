"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { AnalysisResult } from "@/lib/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-6)"];

export function ContributionChart({ analysis }: { analysis: AnalysisResult[] }) {
  const rows = analysis
    .filter((a) => a.beta_std != null)
    .map((a, i) => ({
      variable: a.variable,
      betaStd: Number(a.beta_std),
      beta: a.beta,
      note: a.note,
      color: COLORS[i % COLORS.length],
      label: Number(a.beta_std).toFixed(2),
    }));

  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        회귀 계수 데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={rows.length * 52 + 24}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
        barCategoryGap={14}
      >
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="variable"
          width={92}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          formatter={(v) => [Number(v).toFixed(3), "표준화 β*"]}
        />
        <Bar dataKey="betaStd" radius={[4, 4, 4, 4]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.variable} fill={r.color} />
          ))}
          <LabelList
            dataKey="label"
            position="right"
            fontSize={12}
            fontWeight={600}
            fill="var(--text-secondary)"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
