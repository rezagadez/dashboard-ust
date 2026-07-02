"use client";

import { useEffect, useMemo, useState } from "react";
import { useApiData } from "./useApiData";

interface AuctionRecord {
  auction_date: string;
  security_type: string;
  security_term: string;
  cusip: string;
  offering_amt: string;
  total_tendered: string;
  total_accepted: string;
  bid_to_cover_ratio: string;
  high_yield: string;
  avg_med_yield: string;
  high_investment_rate: string;
  avg_med_investment_rate: string;
}

const SECURITY_TYPES = ["Bill", "Note", "Bond", "TIPS", "FRN"] as const;

function parseNum(raw: string): number | null {
  return raw === "null" ? null : Number(raw);
}

function formatCurrency(raw: string): string {
  const n = parseNum(raw);
  if (n === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatPercent(n: number | null): string {
  return n === null ? "-" : `${n.toFixed(3)}%`;
}

// Bid Tendered/Awarded are shown as plain billions (2 decimals, no $ or "B")
// per user request, so the exported XLS carries a real number Excel can
// compute with rather than a formatted currency string.
function toBillions(raw: string): number | null {
  const n = parseNum(raw);
  return n === null ? null : Math.round((n / 1e9) * 100) / 100;
}

function formatBillions(raw: string): string {
  const n = toBillions(raw);
  return n === null ? "-" : n.toFixed(2);
}

interface AuctionTableProps {
  start: string;
  end: string;
  onLatestAuction?: (info: { securityType: string; securityTerm: string }) => void;
}

export default function AuctionTable({ start, end, onLatestAuction }: AuctionTableProps) {
  const [securityType, setSecurityType] = useState("");
  const [exporting, setExporting] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams({ start, end });
    if (securityType) params.set("type", securityType);
    return `/api/auctions?${params.toString()}`;
  }, [start, end, securityType]);

  const { data, loading, error } = useApiData<AuctionRecord[]>(url);

  useEffect(() => {
    // API sorts -auction_date, so the first row is always the most recent auction.
    if (data && data.length > 0 && onLatestAuction) {
      onLatestAuction({
        securityType: data[0].security_type,
        securityTerm: data[0].security_term,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function handleExport() {
    if (!data || data.length === 0) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = data.map((row) => {
        const isBill = row.security_type === "Bill";
        const high = parseNum(isBill ? row.high_investment_rate : row.high_yield);
        const avg = parseNum(isBill ? row.avg_med_investment_rate : row.avg_med_yield);
        const tailBps = high !== null && avg !== null ? Math.round((high - avg) * 100) : null;
        return {
          "Tanggal Lelang": row.auction_date,
          "Jenis & Tenor": `${row.security_type} ${row.security_term}`,
          CUSIP: row.cusip,
          Ditawarkan: formatCurrency(row.offering_amt),
          "Bid Tendered (bio USD)": toBillions(row.total_tendered),
          "Bid Awarded (bio USD)": toBillions(row.total_accepted),
          "Bid-to-Cover": parseNum(row.bid_to_cover_ratio),
          "High Yield (%)": high,
          "WAY (%)": avg,
          "Tail (bps)": tailBps,
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Auction Results");
      XLSX.writeFile(workbook, `auction-results_${start}_to_${end}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          A. Hasil Lelang UST (Auction Results)
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Jenis:</span>
            <select
              value={securityType}
              onChange={(e) => setSecurityType(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Semua</option>
              {SECURITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={!data || data.length === 0 || exporting}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? "Menyiapkan..." : "Download XLS"}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Memuat data lelang...</p>}
      {error && <p className="text-sm text-red-600">Gagal memuat: {error}</p>}
      {data && data.length === 0 && (
        <p className="text-sm text-slate-500">Tidak ada data lelang pada rentang ini.</p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Tanggal Lelang</th>
                <th className="px-3 py-2">Jenis & Tenor</th>
                <th className="px-3 py-2">CUSIP</th>
                <th className="px-3 py-2 text-right">Ditawarkan</th>
                <th className="px-3 py-2 text-right">Bid Tendered (bio USD)</th>
                <th className="px-3 py-2 text-right">Bid Awarded (bio USD)</th>
                <th className="px-3 py-2 text-right">Bid-to-Cover</th>
                <th className="px-3 py-2 text-right">High Yield*</th>
                <th className="px-3 py-2 text-right">WAY*</th>
                <th className="px-3 py-2 text-right">Tail (bps)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => {
                const isBill = row.security_type === "Bill";
                const high = parseNum(isBill ? row.high_investment_rate : row.high_yield);
                const avg = parseNum(isBill ? row.avg_med_investment_rate : row.avg_med_yield);
                const tailBps =
                  high !== null && avg !== null ? Math.round((high - avg) * 100) : null;

                return (
                  <tr key={`${row.cusip}-${row.auction_date}`} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2">{row.auction_date}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {row.security_type} {row.security_term}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.cusip}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {formatCurrency(row.offering_amt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {formatBillions(row.total_tendered)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {formatBillions(row.total_accepted)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {parseNum(row.bid_to_cover_ratio)?.toFixed(2) ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{formatPercent(high)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{formatPercent(avg)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{tailBps ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        * Untuk Bill, kolom High Yield &amp; WAY memakai Investment Rate (bond-equivalent
        yield) karena Treasury tidak mempublikasikan high_yield/avg_med_yield untuk Bill.
        Auction hari ini biasanya menunjukkan &quot;-&quot; sampai hasil resmi dirilis.
      </p>
    </section>
  );
}
