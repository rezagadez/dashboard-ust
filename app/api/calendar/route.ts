import { NextResponse } from "next/server";
import { getUpcomingAuctions } from "@/lib/treasury";
import { getReleaseDates, MACRO_INDICATORS, FOMC_MEETINGS } from "@/lib/fred";

// Covers "this week" (remainder) + "next week"; the CalendarList component
// buckets these into Hari Ini / Minggu Ini / Minggu Depan at render time.
const WINDOW_DAYS = 14;

// Fed Funds Rate's own FRED release (H.15) is a daily rate statistic, not a
// scheduled data release - its calendar entry is the FOMC meeting instead
// (see lib/fred.ts FOMC_MEETINGS comment), so it's excluded here.
const CALENDAR_INDICATORS = MACRO_INDICATORS.filter((m) => m.id !== "fed_funds");
const RELEASE_IDS = Array.from(new Set(CALENDAR_INDICATORS.map((m) => m.releaseId)));

export interface CalendarEvent {
  date: string;
  label: string;
  type: "auction" | "data_release" | "fomc";
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const today = new Date();
  const todayStr = toDateStr(today);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);
  const windowEndStr = toDateStr(windowEnd);

  try {
    const [upcomingAuctions, releaseDatesByReleaseId] = await Promise.all([
      getUpcomingAuctions(),
      Promise.all(
        RELEASE_IDS.map((releaseId) => getReleaseDates({ releaseId, limit: 24 }))
      ),
    ]);

    const events: CalendarEvent[] = [];

    for (const auction of upcomingAuctions) {
      events.push({
        date: auction.auction_date,
        label: `${auction.security_type} ${auction.security_term} Auction`,
        type: "auction",
      });
    }

    RELEASE_IDS.forEach((releaseId, i) => {
      const dates = releaseDatesByReleaseId[i].filter(
        (d) => d.date >= todayStr && d.date <= windowEndStr
      );
      const indicators = CALENDAR_INDICATORS.filter(
        (m) => m.releaseId === releaseId
      );
      for (const d of dates) {
        for (const indicator of indicators) {
          events.push({
            date: d.date,
            label: indicator.label,
            type: "data_release",
          });
        }
      }
    });

    for (const meeting of FOMC_MEETINGS) {
      if (meeting.decisionDate >= todayStr && meeting.decisionDate <= windowEndStr) {
        events.push({
          date: meeting.decisionDate,
          label: "FOMC Meeting / Rate Decision",
          type: "fomc",
        });
      }
    }

    events.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      data: events,
      window: { start: todayStr, end: windowEndStr },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
