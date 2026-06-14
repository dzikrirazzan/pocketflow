"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type CashFlowPoint = { label: string; income: number; expense: number; net: number };

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function compactNumber(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

function CashFlowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>
      {payload.map((entry) => (
        <div className="chart-tooltip-row" key={String(entry.dataKey)}>
          <span className="chart-tooltip-dot" style={{ background: entry.color }} />
          <span className="chart-tooltip-name">{entry.name}</span>
          <strong>{formatIDR(entry.value ?? 0)}</strong>
        </div>
      ))}
    </div>
  );
}

export const chartColors = { income: "#54a45a", expense: "#d65a4a", net: "#f76f53" };

export default function CashFlowChart({ data, theme = "dark" }: { data: CashFlowPoint[]; theme?: "light" | "dark" }) {
  const grid = theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(46,46,46,0.09)";
  const axis = theme === "dark" ? "#807d72" : "#8a8676";
  const cursor = theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(46,46,46,0.04)";

  return (
    <div className="chart-card-body">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1} initialDimension={{ width: 640, height: 340 }}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={4} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: axis, fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: axis, fontSize: 12 }} tickFormatter={(value: number) => compactNumber(value)} />
          <Tooltip content={<CashFlowTooltip />} cursor={{ fill: cursor }} />
          <Bar dataKey="income" name="Income" fill={chartColors.income} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="expense" name="Expenses" fill={chartColors.expense} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Line dataKey="net" name="Net" type="monotone" stroke={chartColors.net} strokeWidth={2.5} dot={{ r: 3, fill: chartColors.net, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
