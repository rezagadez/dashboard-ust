"use client";

import { useMemo } from "react";
import { useApiData } from "./useApiData";

interface Indicator {
  id: string;
  label: string;
  seriesId: string;
  frequency: string;
  observations: { date: string; value: number | null }[];
}

interface MacroTableProps {
  start: string;
  end: string;
}

export default function MacroTable({ start, end }: MacroTableProps) {
  const url = useMemo(
    () => `/api/macro?${new URLSearchParams({ start, end }).toString()}`,
    [start, end]
  );
  const { data, loading, error } = useApiData<Indicator[]>(url);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">D. 10 Indikator Makro Utama</h2>
      <p className="text-xs text-slate-500">
        Ditampilkan sebagai tabel per-indikator (bukan satu matrix gabungan) karena frekuensi
        rilis tiap indikator berbeda-beda, supaya tetap enak dibaca di layar HP.
      </p>

      {loading && <p className="text-sm text-slate-500">Memuat data makro...</p>}
      {error && <p className="text-sm text-red-600">Gagal memuat: {error}</p>}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.map((indicator) => {
            const rows = [...indicator.observations].reverse();
            return (
              <div key={indicator.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">{indicator.label}</h3>
                  <span className="whitespace-nowrap rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-slate-500">
                    {indicator.frequency}
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1">Tanggal</th>
                        <th className="py-1 text-right">Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((o) => (
                        <tr key={o.date}>
                          <td className="py-1">{o.date}</td>
                          <td className="py-1 text-right">{o.value ?? "-"}</td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-2 text-center text-slate-400">
                            Tidak ada data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
