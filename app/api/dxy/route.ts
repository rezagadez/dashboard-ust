import { NextRequest, NextResponse } from "next/server";
import { getSeriesObservations, DXY_SERIES_ID } from "@/lib/fred";

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
    const data = await getSeriesObservations({
      seriesId: DXY_SERIES_ID,
      start,
      end,
    });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
