"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApiData } from "./useApiData";

// Duplicated on purpose from lib/fred.ts's TENOR_TO_FRED_SERIES: components
// only ever call our own /api/* routes, never FRED directly, so this is
// just a UI label lookup, not a second source of truth for fetching.
const TENOR_TO_SERIES: Record<string, string> = {
  "4-Week": "DGS1MO",
  "8-Week": "DGS1MO",
  "13-Week": "DGS3MO",
  "17-Week": "DGS3MO",
  "26-Week": "DGS6MO",
  "52-Week": "DGS1",
  "2-Year": "DGS2",
  "3-Year": "DGS3",
  "5-Year": "DGS5",
  "7-Year": "DGS7",
  "10-Year": "DGS10",
  "20-Year": "DGS20",
  "30-Year": "DGS30",
};

const TENOR_OPTIONS = [
  { label: "1-Bulan", series: "DGS1MO" },
  { label: "3-Bulan", series: "DGS3MO" },
  { label: "6-Bulan", series: "DGS6MO" },
  { label: "1-Tahun", series: "DGS1" },
  { label: "2-Tahun", series: "DGS2" },
  { label: "3-Tahun", series: "DGS3" },
  { label: "5-Tahun", series: "DGS5" },
  { label: "7-Tahun", series: "DGS7" },
  { label: "10-Tahun", series: "DGS10" },
  { label: "20-Tahun", series: "DGS20" },
  { label: "30-Tahun", series: "DGS30" },
];

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

interface Observation {
  date: string;
  value: number | null;
}

interface YieldChartProps {
  start: string;
  end: string;
  defaultTenor?: string; // security_term of the latest auction (e.g. "10-Year")
}

export default function YieldChart({ start, end, defaultTenor }: YieldChartProps) {
  const [selected, setSelected] = useState<string[]>(["DGS10"]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && defaultTenor) {
      const series = TENOR_TO_SERIES[defaultTenor];
      if (series) setSelected([series]);
      setInitialized(true);
    }
  }, [defaultTenor, initialized]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ start, end, series: selected.join(",") });
    return `/api/yields?${params.toString()}`;
  }, [start, end, selected]);

  const { data, loading, error } = useApiData<Record<string, Observation[]>>(
    selected.length > 0 ? url : ""
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    const dateSet = new Set<string>();
    for (const series of Object.values(data)) {
      for (const obs of series) dateSet.add(obs.date);
    }
    const dates = Array.from(dateSet).sort();
    return dates.map((date) => {
      const point: Record<string, string | number | null> = { date };
      for (const seriesId of Object.keys(data)) {
        point[seriesId] = data[seriesId].find((o) => o.date === date)?.value ?? null;
      }
      return point;
    });
  }, [data]);

  function toggleTenor(series: string) {
    setSelected((prev) =>
      prev.includes(series) ? prev.filter((s) => s !== series) : [...prev, series]
    );
  }

  // Spread only makes sense for exactly 2 tenors - order them short/long by
  // their position in TENOR_OPTIONS (already sorted shortest to longest).
  const spreadInfo = useMemo(() => {
    if (selected.length !== 2) return null;
    const [a, b] = selected;
    const indexA = TENOR_OPTIONS.findIndex((o) => o.series === a);
    const indexB = TENOR_OPTIONS.findIndex((o) => o.series === b);
    const shortSeries = indexA <= indexB ? a : b;
    const longSeries = indexA <= indexB ? b : a;
    return {
      shortSeries,
      longSeries,
      shortLabel: TENOR_OPTIONS.find((o) => o.series === shortSeries)?.label ?? shortSeries,
      longLabel: TENOR_OPTIONS.find((o) => o.series === longSeries)?.label ?? longSeries,
    };
  }, [selected]);

  const spreadData = useMemo(() => {
    if (!spreadInfo) return [];
    return chartData.map((point) => {
      const shortVal = point[spreadInfo.shortSeries];
      const longVal = point[spreadInfo.longSeries];
      const spread =
        typeof shortVal === "number" && typeof longVal === "number"
          ? Math.round((longVal - shortVal) * 100 * 100) / 100
          : null;
      return { date: point.date, spread };
    });
  }, [spreadInfo, chartData]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        B. Yield Pasar Sekunder (Secondary Market Yield)
      </h2>

      <div className="flex flex-wrap gap-2">
        {TENOR_OPTIONS.map((opt) => (
          <button
            key={opt.series}
            type="button"
            onClick={() => toggleTenor(opt.series)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              selected.includes(opt.series)
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {selected.length === 0 && (
        <p className="text-sm text-slate-500">Pilih minimal satu tenor.</p>
      )}
      {loading && <p className="text-sm text-slate-500">Memuat data yield...</p>}
      {error && <p className="text-sm text-red-600">Gagal memuat: {error}</p>}

      {chartData.length > 0 && (
        <div className="h-72 w-full rounded-lg border border-slate-200 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis tick={{ fontSize: 11 }} unit="%" width={40} domain={["auto", "auto"]} />
              <Tooltip />
              <Legend />
              {selected.map((series, i) => (
                <Line
                  key={series}
                  type="monotone"
                  dataKey={series}
                  name={TENOR_OPTIONS.find((o) => o.series === series)?.label ?? series}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {spreadInfo && spreadData.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600">
            Spread {spreadInfo.longLabel} &minus; {spreadInfo.shortLabel} (bps)
          </p>
          <div className="h-48 w-full rounded-lg border border-slate-200 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spreadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11 }} width={40} domain={["auto", "auto"]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="spread"
                  name="Spread (bps)"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.2}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
