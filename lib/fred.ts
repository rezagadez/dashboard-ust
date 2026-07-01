const BASE_URL = "https://api.stlouisfed.org/fred";

function apiKey(): string {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    throw new Error("FRED_API_KEY is not set in the environment");
  }
  return key;
}

export interface FredObservation {
  date: string;
  value: number | null;
}

export interface FredReleaseDate {
  release_id: number;
  date: string;
}

class FredApiError extends Error {}

async function fredFetch<T>(
  path: string,
  params: Record<string, string>,
  revalidate: number
): Promise<T> {
  const search = new URLSearchParams({
    ...params,
    api_key: apiKey(),
    file_type: "json",
  }).toString();

  const res = await fetch(`${BASE_URL}${path}?${search}`, {
    next: { revalidate },
  });

  const json = await res.json();

  if (!res.ok || json.error_code) {
    throw new FredApiError(
      `FRED API error for ${path}: ${json.error_message ?? res.statusText}`
    );
  }

  return json as T;
}

// FRED marks missing observations with the literal string "." instead of
// omitting them - convert those to null rather than dropping the date.
function parseObservationValue(raw: string): number | null {
  return raw === "." ? null : Number(raw);
}

export interface GetSeriesObservationsParams {
  seriesId: string;
  start?: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
  revalidate?: number; // seconds, default 600 (10 min) per spec section 9
}

export async function getSeriesObservations({
  seriesId,
  start,
  end,
  revalidate = 600,
}: GetSeriesObservationsParams): Promise<FredObservation[]> {
  const params: Record<string, string> = { series_id: seriesId };
  if (start) params.observation_start = start;
  if (end) params.observation_end = end;

  const json = await fredFetch<{
    observations: { date: string; value: string }[];
  }>("/series/observations", params, revalidate);

  return json.observations.map((o) => ({
    date: o.date,
    value: parseObservationValue(o.value),
  }));
}

export async function getMultipleSeriesObservations(
  seriesIds: string[],
  range: { start?: string; end?: string; revalidate?: number }
): Promise<Record<string, FredObservation[]>> {
  const entries = await Promise.all(
    seriesIds.map(async (seriesId) => {
      const observations = await getSeriesObservations({ seriesId, ...range });
      return [seriesId, observations] as const;
    })
  );

  return Object.fromEntries(entries);
}

export interface GetReleaseDatesParams {
  releaseId: number;
  includeFuture?: boolean;
  limit?: number;
}

export async function getReleaseDates({
  releaseId,
  includeFuture = true,
  limit = 10,
}: GetReleaseDatesParams): Promise<FredReleaseDate[]> {
  const json = await fredFetch<{ release_dates: FredReleaseDate[] }>(
    "/release/dates",
    {
      release_id: String(releaseId),
      include_release_dates_with_no_data: String(includeFuture),
      sort_order: "desc",
      limit: String(limit),
    },
    3600
  );

  return json.release_dates;
}

// --- Series / release mappings verified against the live FRED API ---

// DXY proxy per spec section 6.
export const DXY_SERIES_ID = "DTWEXBGS";

// Auction tenor -> FRED constant-maturity series. DGS4MO does not exist on
// FRED (verified), so the 17-week bill falls back to its closer neighbor,
// DGS3MO (119 days is nearer to the 91-day point than the 182-day point).
export const TENOR_TO_FRED_SERIES: Record<string, string> = {
  "4-Week": "DGS1MO",
  "8-Week": "DGS1MO",
  "13-Week": "DGS3MO",
  "17-Week": "DGS3MO",
  "26-Week": "DGS6MO",
  "52-Week": "DGS1",
  "2-Year": "DGS2",
  "3-Year": "DGS3",
  "5-Year": "DGS5",
  "7-Year": "DGS7",
  "10-Year": "DGS10",
  "20-Year": "DGS20",
  "30-Year": "DGS30",
};

export interface MacroIndicator {
  id: string;
  label: string;
  seriesId: string;
  releaseId: number;
  frequency: "Monthly" | "Quarterly";
}

// releaseId is shared where FRED bundles indicators into the same release
// (e.g. CPI & Core CPI are published together) - verified against
// /fred/series/release for each series.
export const MACRO_INDICATORS: MacroIndicator[] = [
  { id: "cpi", label: "CPI (headline inflation)", seriesId: "CPIAUCSL", releaseId: 10, frequency: "Monthly" },
  { id: "core_cpi", label: "Core CPI (ex food & energy)", seriesId: "CPILFESL", releaseId: 10, frequency: "Monthly" },
  { id: "pce", label: "PCE Price Index", seriesId: "PCEPI", releaseId: 54, frequency: "Monthly" },
  { id: "core_pce", label: "Core PCE", seriesId: "PCEPILFE", releaseId: 54, frequency: "Monthly" },
  { id: "fed_funds", label: "Fed Funds Rate (effective)", seriesId: "FEDFUNDS", releaseId: 18, frequency: "Monthly" },
  { id: "nfp", label: "Nonfarm Payrolls (NFP)", seriesId: "PAYEMS", releaseId: 50, frequency: "Monthly" },
  { id: "unemployment", label: "Unemployment Rate", seriesId: "UNRATE", releaseId: 50, frequency: "Monthly" },
  { id: "gdp", label: "Real GDP", seriesId: "GDPC1", releaseId: 53, frequency: "Quarterly" },
  // ISM Manufacturing PMI (NAPM/NAPMPI) was pulled from FRED over licensing -
  // verified missing on the live API - falls back to Industrial Production.
  { id: "ism_pmi", label: "ISM Manufacturing PMI (proxy: Industrial Production)", seriesId: "INDPRO", releaseId: 13, frequency: "Monthly" },
  { id: "retail_sales", label: "Retail Sales", seriesId: "RSAFS", releaseId: 9, frequency: "Monthly" },
];

// FRED's "FOMC Press Release" release (id 101) fires daily alongside the
// DFEDTARL/DFEDTARU target-rate series - it does NOT give meeting-only
// dates. Verified live; no clean FRED release exists for meeting dates, so
// per spec section 11 point 6, the schedule is hardcoded from the Fed's
// published calendar (federalreserve.gov/monetarypolicy/fomccalendars.htm).
export interface FomcMeeting {
  start: string; // YYYY-MM-DD
  decisionDate: string; // YYYY-MM-DD, second day of the meeting
}

export const FOMC_MEETINGS: FomcMeeting[] = [
  { start: "2026-01-27", decisionDate: "2026-01-28" },
  { start: "2026-03-17", decisionDate: "2026-03-18" },
  { start: "2026-04-28", decisionDate: "2026-04-29" },
  { start: "2026-06-16", decisionDate: "2026-06-17" },
  { start: "2026-07-28", decisionDate: "2026-07-29" },
  { start: "2026-09-15", decisionDate: "2026-09-16" },
  { start: "2026-10-27", decisionDate: "2026-10-28" },
  { start: "2026-12-08", decisionDate: "2026-12-09" },
  { start: "2027-01-26", decisionDate: "2027-01-27" },
  { start: "2027-03-16", decisionDate: "2027-03-17" },
  { start: "2027-04-27", decisionDate: "2027-04-28" },
  { start: "2027-06-08", decisionDate: "2027-06-09" },
  { start: "2027-07-27", decisionDate: "2027-07-28" },
  { start: "2027-09-14", decisionDate: "2027-09-15" },
  { start: "2027-10-26", decisionDate: "2027-10-27" },
  { start: "2027-12-07", decisionDate: "2027-12-08" },
];
