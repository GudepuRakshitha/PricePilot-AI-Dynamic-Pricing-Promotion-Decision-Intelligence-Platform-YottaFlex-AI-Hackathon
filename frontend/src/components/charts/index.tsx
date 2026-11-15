import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryPerformance, CompetitorPosition, TrendPoint } from "../../types";
import { CHART_COLORS } from "../../lib/constants";
import { money, moneyCompact } from "../../lib/format";

const axisStyle = { fontSize: 11, fill: "#64748b" };
const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 8px 24px -12px rgba(15,23,42,0.3)",
};

function shortDate(value: string): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2549e8" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2549e8" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(value: number) => moneyCompact(value)}
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [money(value), name]}
          labelFormatter={(label: string) => shortDate(label)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#2549e8"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
        <Area
          type="monotone"
          dataKey="gross_profit"
          name="Gross profit"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#profitFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MarginTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(value: number) => `${value.toFixed(0)}%`}
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`${Number(value).toFixed(2)}%`, "Gross margin"]}
          labelFormatter={(label: string) => shortDate(label)}
        />
        <Line
          type="monotone"
          dataKey="gross_margin_pct"
          stroke="#8b5cf6"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryChart({ data }: { data: CategoryPerformance[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-18}
          textAnchor="end"
          height={54}
        />
        <YAxis
          tickFormatter={(value: number) => moneyCompact(value)}
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [money(value), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill="#2549e8" radius={[4, 4, 0, 0]} maxBarSize={38} />
        <Bar
          dataKey="gross_profit"
          name="Gross profit"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
          maxBarSize={38}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({
  data,
  colors = CHART_COLORS,
}: {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
}) {
  const filtered = data.filter((item) => item.value > 0);
  if (filtered.length === 0) {
    return (
      <div className="grid h-[220px] place-items-center text-xs text-slate-400">
        No records to chart yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={2}
        >
          {filtered.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PriceComparisonChart({ rows }: { rows: CompetitorPosition[] }) {
  const data = rows.slice(0, 10).map((row) => ({
    sku: row.sku.replace("SKU-", ""),
    ours: row.our_price ?? 0,
    competitor: row.observed_price,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="sku" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(value: number) => moneyCompact(value)}
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [money(value), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="ours" name="Our price" fill="#2549e8" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar
          dataKey="competitor"
          name="Competitor"
          fill="#f59e0b"
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
