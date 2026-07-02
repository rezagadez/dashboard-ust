import { NextRequest, NextResponse } from "next/server";
import {
  getMultipleSeriesObservations,
  MACRO_INDICATORS,
  type FredObservation,
} from "@/lib/fred";

const MACRO_REVALIDATE = 1800; // macro data changes rarely intraday, per spec section 9
const GDP_QUARTERS = 8;

function yearToDate() {
  const now = new Date();
  return {
    start: `${now.getFullYear()}-01-01`,
    end: now.toISOString().slice(0, 10),
  };
}

// GDP must always show the last 8 quarters regardless of the shared date
// range filter, so it gets its own lookback window (25 months of cushion,
// then trimmed to the last 8 observations).
function monthsBefore(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const defaults = yearToDate();
  const start = searchParams.get("start") ?? defaults.start;
  const end = searchParams.get("end") ?? defaults.end;

  try {
    const levelIndicators = MACRO_INDICATORS.filter((m) => m.displayMode === "level" && m.id !== "gdp");
    const pchIndicators = MACRO_INDICATORS.filter((m) => m.displayMode === "pch");
    const yoyMomIndicators = MACRO_INDICATORS.filter((m) => m.displayMode === "yoy_mom");
    const gdpIndicator = MACRO_INDICATORS.find((m) => m.id === "gdp")!;

    const [levelObs, pchObs, yoyObs, momObs, gdpObs] = await Promise.all([
      getMultipleSeriesObservations(
        levelIndicators.map((m) => m.seriesId),
        { start, end, revalidate: MACRO_REVALIDATE }
      ),
      getMultipleSeriesObservations(
        pchIndicators.map((m) => m.seriesId),
        { start, end, units: "pch", revalidate: MACRO_REVALIDATE }
      ),
      getMultipleSeriesObservations(
        yoyMomIndicators.map((m) => m.seriesId),
        { start, end, units: "pc1", revalidate: MACRO_REVALIDATE }
      ),
      getMultipleSeriesObservations(
        yoyMomIndicators.map((m) => m.seriesId),
        { start, end, units: "pch", revalidate: MACRO_REVALIDATE }
      ),
      getMultipleSeriesObservations([gdpIndicator.seriesId], {
        start: monthsBefore(end, GDP_QUARTERS * 3 + 1),
        end,
        revalidate: MACRO_REVALIDATE,
      }),
    ]);

    const data = MACRO_INDICATORS.map((indicator) => {
      if (indicator.id === "gdp") {
        const observations: FredObservation[] = gdpObs[indicator.seriesId].slice(-GDP_QUARTERS);
        return { ...indicator, observations };
      }
      if (indicator.displayMode === "pch") {
        return { ...indicator, observations: pchObs[indicator.seriesId] };
      }
      if (indicator.displayMode === "yoy_mom") {
        return {
          ...indicator,
          yoy: yoyObs[indicator.seriesId],
          mom: momObs[indicator.seriesId],
        };
      }
      return { ...indicator, observations: levelObs[indicator.seriesId] };
    });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
