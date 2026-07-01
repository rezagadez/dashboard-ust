import { NextRequest, NextResponse } from "next/server";
import { getMultipleSeriesObservations, TENOR_TO_FRED_SERIES } from "@/lib/fred";

const VALID_SERIES = new Set(Object.values(TENOR_TO_FRED_SERIES));

function yearToDate() {
  const now = new Date();
  return {
    start: `${now.getFullYear()}-01-01`,
    end: now.toISOString().slice(0, 10),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seriesParam = searchParams.get("series");
  // Default DGS10 if the caller omits `series` entirely. The UI's real default
  // (tenor most recently auctioned in table A) is decided client-side, since
  // that depends on data the API itself doesn't track.
  const series = seriesParam
    ? seriesParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : ["DGS10"];

  const invalid = series.filter((s) => !VALID_SERIES.has(s));
  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error: `Unknown series: ${invalid.join(", ")}. Valid: ${Array.from(VALID_SERIES).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const defaults = yearToDate();
  const start = searchParams.get("start") ?? defaults.start;
  const end = searchParams.get("end") ?? defaults.end;

  try {
    const data = await getMultipleSeriesObservations(series, { start, end });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
