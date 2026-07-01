"use client";

import { useMemo } from "react";
import { useApiData } from "./useApiData";

interface CalendarEvent {
  date: string;
  label: string;
  type: "auction" | "data_release" | "fomc";
}

const TYPE_STYLES: Record<CalendarEvent["type"], { badge: string; text: string }> = {
  auction: { badge: "bg-blue-100 text-blue-700", text: "Auction" },
  data_release: { badge: "bg-green-100 text-green-700", text: "Data Release" },
  fomc: { badge: "bg-purple-100 text-purple-700", text: "FOMC" },
};

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Monday-Sunday weeks, matching how "minggu ini/depan" is normally understood.
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export default function CalendarList() {
  const { data, loading, error } = useApiData<CalendarEvent[]>("/api/calendar");

  const groups = useMemo(() => {
    if (!data) return null;

    const today = new Date();
    const todayStr = toDateStr(today);
    const thisWeekStart = startOfWeek(today);
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
    const nextWeekStart = new Date(thisWeekEnd);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);

    const thisWeekStartStr = toDateStr(thisWeekStart);
    const thisWeekEndStr = toDateStr(thisWeekEnd);
    const nextWeekStartStr = toDateStr(nextWeekStart);
    const nextWeekEndStr = toDateStr(nextWeekEnd);

    const todayEvents: CalendarEvent[] = [];
    const thisWeek: CalendarEvent[] = [];
    const nextWeek: CalendarEvent[] = [];

    for (const event of data) {
      if (event.date === todayStr) {
        todayEvents.push(event);
      } else if (event.date >= thisWeekStartStr && event.date <= thisWeekEndStr) {
        thisWeek.push(event);
      } else if (event.date >= nextWeekStartStr && event.date <= nextWeekEndStr) {
        nextWeek.push(event);
      }
    }

    return { today: todayEvents, thisWeek, nextWeek };
  }, [data]);

  function renderGroup(title: string, events: CalendarEvent[]) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
        {events.length === 0 ? (
          <p className="text-xs text-slate-400">Tidak ada jadwal.</p>
        ) : (
          <ul className="space-y-1.5">
            {events.map((event, i) => (
              <li
                key={`${event.date}-${event.label}-${i}`}
                className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-slate-800">{event.date}</span>{" "}
                  <span className="text-slate-600">{event.label}</span>
                </span>
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_STYLES[event.type].badge}`}
                >
                  {TYPE_STYLES[event.type].text}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">E. Kalender Rilis Data</h2>

      {loading && <p className="text-sm text-slate-500">Memuat kalender...</p>}
      {error && <p className="text-sm text-red-600">Gagal memuat: {error}</p>}

      {groups && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {renderGroup("Hari Ini", groups.today)}
          {renderGroup("Minggu Ini", groups.thisWeek)}
          {renderGroup("Minggu Depan", groups.nextWeek)}
        </div>
      )}
    </section>
  );
}
