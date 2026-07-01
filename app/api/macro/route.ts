import { NextRequest, NextResponse } from "next/server";
import { getMultipleSeriesObservations, MACRO_INDICATORS } from "@/lib/fred";

function yearToDate() {
  const now = new Date();
  return {
    start: `${now.getFullYear()}-01-01`,
    end: now.toISOString().slice(0, 10),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const defaults = yearToDate();
  const start = searchParams.get("start") ?? defaults.start;
  const end = searchParams.get("end") ?? defaults.end;

  try {
    const seriesIds = MACRO_INDICATORS.map((m) => m.seriesId);
    const observations = await getMultipleSeriesObservations(seriesIds, {
      start,
      end,
      revalidate: 1800, // macro data changes rarely intraday, per spec section 9
    });

    const data = MACRO_INDICATORS.map((indicator) => ({
      ...indicator,
      observations: observations[indicator.seriesId],
    }));

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
