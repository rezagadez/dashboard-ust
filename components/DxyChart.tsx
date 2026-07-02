"use client";

import { useMemo } from "react";
import {
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

interface Observation {
  date: string;
  value: number | null;
}

interface DxyChartProps {
  start: string;
  end: string;
}

type Point = { date: string; dxy: number | null; idr: number | null };

function mergeByDate(dxy: Observation[], idr: Observation[]): Point[] {
  const byDate = new Map<string, Point>();
  for (const o of dxy) byDate.set(o.date, { date: o.date, dxy: o.value, idr: null });
  for (const o of idr) {
    const existing = byDate.get(o.date);
    if (existing) existing.idr = o.value;
    else byDate.set(o.date, { date: o.date, dxy: null, idr: o.value });
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Day-over-day percent change within a single series' own sequence (so a
// missing day in the other series doesn't skip a step here).
function toDailyPctChange(obs: Observation[]): Observation[] {
  const result: Observation[] = [];
  let prev: number | null = null;
  for (const o of obs) {
    result.push({
      date: o.date,
      value: prev !== null && o.value !== null && prev !== 0 ? ((o.value / prev) - 1) * 100 : null,
    });
    if (o.value !== null) prev = o.value;
  }
  return result;
}

export default function DxyChart({ start, end }: DxyChartProps) {
  const dxyUrl = useMemo(
    () => `/api/dxy?${new URLSearchParams({ start, end }).toString()}`,
    [start, end]
  );
  const idrUrl = useMemo(
    () => `/api/idr?${new URLSearchParams({ start, end }).toString()}`,
    [start, end]
  );
  const dxy = useApiData<Observation[]>(dxyUrl);
  const idr = useApiData<Observation[]>(idrUrl);

  const loading = dxy.loading || idr.loading;
  const error = dxy.error ?? idr.error;

  const levelData = useMemo(() => {
    if (!dxy.data || !idr.data) return [];
    return mergeByDate(dxy.data, idr.data);
  }, [dxy.data, idr.data]);

  const changeData = useMemo(() => {
    if (!dxy.data || !idr.data) return [];
    return mergeByDate(toDailyPctChange(dxy.data), toDailyPctChange(idr.data));
  }, [dxy.data, idr.data]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        C. Fed Broad Dollar Index (proxy DXY) &amp; USD/IDR
      </h2>
      <p className="text-xs text-slate-500">
        Nominal Broad U.S. Dollar Index dari The Fed (DTWEXBGS) — dipakai sebagai proxy DXY,
        bukan ticker ICE DXY asli. Kurs USD/IDR dari Yahoo Finance (IDR=X), FRED tidak
        menyediakan data harian untuk Indonesia.
      </p>

      {loading && <p className="text-sm text-slate-500">Memuat data DXY &amp; IDR...</p>}
      {error && <p className="text-sm text-red-600">Gagal memuat: {error}</p>}

      {levelData.length > 0 && (
        <div className="h-64 w-full rounded-lg border border-slate-200 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={levelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis
                yAxisId="dxy"
                tick={{ fontSize: 11 }}
                width={45}
                domain={["auto", "auto"]}
              />
              <YAxis
                yAxisId="idr"
                orientation="right"
                tick={{ fontSize: 11 }}
                width={55}
                domain={["auto", "auto"]}
              />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="dxy"
                type="monotone"
                dataKey="dxy"
                name="Fed Broad Dollar Index"
                stroke="#0891b2"
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="idr"
                type="monotone"
                dataKey="idr"
                name="USD/IDR"
                stroke="#dc2626"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {changeData.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600">
            Persentase Perubahan Harian (Day-over-Day)
          </p>
          <div className="h-48 w-full rounded-lg border border-slate-200 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={changeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11 }} unit="%" width={45} domain={["auto", "auto"]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="dxy"
                  name="DXY % harian"
                  stroke="#0891b2"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="idr"
                  name="USD/IDR % harian"
                  stroke="#dc2626"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
