"use client";

import { useState } from "react";
import AuctionTable from "@/components/AuctionTable";
import YieldChart from "@/components/YieldChart";
import DxyChart from "@/components/DxyChart";
import MacroTable from "@/components/MacroTable";
import CalendarList from "@/components/CalendarList";
import DateRangeForm, { DateRange } from "@/components/DateRangeForm";

function yearToDate(): DateRange {
  const now = new Date();
  return {
    start: `${now.getFullYear()}-01-01`,
    end: now.toISOString().slice(0, 10),
  };
}

export default function Home() {
  const [range, setRange] = useState<DateRange>(yearToDate());
  const [latestTenor, setLatestTenor] = useState<string | undefined>();

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">
          Dashboard UST Auction, Yield, DXY &amp; Makro
        </h1>
        <p className="text-sm text-slate-500">
          Rentang tanggal di bawah berlaku untuk tabel lelang, chart yield, chart DXY, dan
          tabel makro. Kalender rilis (bagian E) selalu menampilkan jadwal 2 minggu ke depan.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <DateRangeForm value={range} onChange={setRange} />
      </div>

      <AuctionTable
        start={range.start}
        end={range.end}
        onLatestAuction={(a) => setLatestTenor(a.securityTerm)}
      />
      <YieldChart start={range.start} end={range.end} defaultTenor={latestTenor} />
      <DxyChart start={range.start} end={range.end} />
      <MacroTable start={range.start} end={range.end} />
      <CalendarList />
    </main>
  );
}
