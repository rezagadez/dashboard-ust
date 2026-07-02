import { NextRequest, NextResponse } from "next/server";
import { getYahooDailyClose, USD_IDR_SYMBOL } from "@/lib/yahoo";

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
    const data = await getYahooDailyClose({
      symbol: USD_IDR_SYMBOL,
      start,
      end,
      revalidate: 600,
    });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
