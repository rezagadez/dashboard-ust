"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
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

export default function DxyChart({ start, end }: DxyChartProps) {
  const url = useMemo(
    () => `/api/dxy?${new URLSearchParams({ start, end }).toString()}`,
    [start, end]
  );
  const { data, loading, error } = useApiData<Observation[]>(url);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        C. Fed Broad Dollar Index (proxy DXY)
      </h2>
      <p className="text-xs text-slate-500">
        Nominal Broad U.S. Dollar Index dari The Fed (DTWEXBGS) — dipakai sebagai proxy DXY,
        bukan ticker ICE DXY asli.
      </p>

      {loading && <p className="text-sm text-slate-500">Memuat data DXY...</p>}
      {error && <p className="text-sm text-red-600">Gagal memuat: {error}</p>}

      {data && data.length > 0 && (
        <div className="h-64 w-full rounded-lg border border-slate-200 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis tick={{ fontSize: 11 }} width={45} domain={["auto", "auto"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                name="Fed Broad Dollar Index"
                stroke="#0891b2"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
