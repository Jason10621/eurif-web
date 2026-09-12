"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Row = {
  name: string;
  todo: number;
  in_progress: number;
  done: number;
  total: number;
};

const LABELS: Record<string, string> = {
  todo: "예정",
  in_progress: "진행 중",
  done: "완료",
};

export function TaskStatusChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 46 + 40)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        barCategoryGap={14}
      >
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={64}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          formatter={(v, k) => [`${v}개`, LABELS[String(k)] ?? String(k)]}
        />
        <Legend
          formatter={(v) => (
            <span className="text-xs text-text-secondary">
              {LABELS[String(v)] ?? String(v)}
            </span>
          )}
        />
        <Bar
          dataKey="done"
          stackId="t"
          fill="var(--status-done)"
          radius={[4, 0, 0, 4]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="in_progress"
          stackId="t"
          fill="var(--primary)"
          isAnimationActive={false}
        />
        <Bar
          dataKey="todo"
          stackId="t"
          fill="var(--status-planned)"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
