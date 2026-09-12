"use client";

import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

export function OverallProgress({
  value,
  doneCount,
  totalCount,
}: {
  value: number;
  doneCount: number;
  totalCount: number;
}) {
  const data = [{ name: "progress", value }];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={{ fill: "var(--surface-3)" }}
            dataKey="value"
            cornerRadius={999}
            fill="var(--primary)"
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums">{value}%</span>
        <span className="mt-1 text-xs text-muted">
          목표 {doneCount}/{totalCount} 완료
        </span>
      </div>
    </div>
  );
}
