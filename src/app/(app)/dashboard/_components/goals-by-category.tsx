"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

type Row = {
  category: string;
  done: number;
  remaining: number;
  total: number;
  pct: number;
};

export function GoalsByCategory({ data }: { data: Row[] }) {
  const rows = [...data]
    .sort((a, b) => b.total - a.total)
    .map((r) => ({ ...r, pctLabel: `${r.pct}%` }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 44)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
        barCategoryGap={12}
      >
        <XAxis type="number" hide domain={[0, "dataMax"]} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="category"
          width={56}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          formatter={(v, name) => [`${v}개`, name === "done" ? "완료" : "남음"]}
        />
        <Bar
          dataKey="done"
          stackId="g"
          fill="var(--primary)"
          radius={[4, 0, 0, 4]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="remaining"
          stackId="g"
          fill="var(--surface-3)"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="pctLabel"
            position="right"
            fontSize={11}
            fill="var(--muted)"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
