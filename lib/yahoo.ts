// Yahoo Finance's chart endpoint is undocumented but public and requires no
// API key. Used only for USD/IDR, since FRED has no daily Indonesia FX series
// (verified live: DEXINUS is India, not Indonesia; FRED's Indonesia series
// are monthly/quarterly averages, not daily closes).
const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

export const USD_IDR_SYMBOL = "IDR=X";

export interface YahooObservation {
  date: string;
  value: number | null;
}

class YahooApiError extends Error {}

export interface GetYahooDailyCloseParams {
  symbol: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  revalidate?: number;
}

export async function getYahooDailyClose({
  symbol,
  start,
  end,
  revalidate = 600,
}: GetYahooDailyCloseParams): Promise<YahooObservation[]> {
  const period1 = Math.floor(new Date(`${start}T00:00:00Z`).getTime() / 1000);
  // +1 day so the end date itself is included in the range.
  const period2 = Math.floor(new Date(`${end}T00:00:00Z`).getTime() / 1000) + 86400;

  const params = new URLSearchParams({
    period1: String(period1),
    period2: String(period2),
    interval: "1d",
  });

  const res = await fetch(`${CHART_URL}/${encodeURIComponent(symbol)}?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate },
  });

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  if (!res.ok || !result) {
    throw new YahooApiError(
      `Yahoo Finance error for ${symbol}: ${json?.chart?.error?.description ?? res.statusText}`
    );
  }

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    value: closes[i] ?? null,
  }));
}
