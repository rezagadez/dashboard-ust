const BASE_URL =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od";

// Verified against the live API: these are the literal field names returned by
// auctions_query. high_yield / avg_med_yield are populated for Note/Bond/TIPS/FRN
// but come back as the string "null" for Bills, which instead populate
// high_investment_rate / avg_med_investment_rate. There is no official "tail"
// field - callers must compute it from whichever yield pair applies.
const AUCTION_FIELDS = [
  "auction_date",
  "security_type",
  "security_term",
  "cusip",
  "offering_amt",
  "total_tendered",
  "total_accepted",
  "bid_to_cover_ratio",
  "high_yield",
  "avg_med_yield",
  "high_investment_rate",
  "avg_med_investment_rate",
] as const;

const UPCOMING_AUCTION_FIELDS = [
  "record_date",
  "security_type",
  "security_term",
  "reopening",
  "cusip",
  "offering_amt",
  "announcemt_date",
  "auction_date",
  "issue_date",
] as const;

export interface TreasuryAuctionRecord {
  auction_date: string;
  security_type: string;
  security_term: string;
  cusip: string;
  offering_amt: string;
  total_tendered: string;
  total_accepted: string;
  bid_to_cover_ratio: string;
  high_yield: string;
  avg_med_yield: string;
  high_investment_rate: string;
  avg_med_investment_rate: string;
}

export interface UpcomingAuctionRecord {
  record_date: string;
  security_type: string;
  security_term: string;
  reopening: string;
  cusip: string;
  offering_amt: string;
  announcemt_date: string;
  auction_date: string;
  issue_date: string;
}

interface FiscalDataResponse<T> {
  data: T[];
  meta: { count: number; "total-count": number; "total-pages": number };
}

class TreasuryApiError extends Error {}

async function fetchFiscalData<T>(
  path: string,
  params: Record<string, string>,
  revalidate: number
): Promise<T[]> {
  const search = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${path}?${search}`;

  const res = await fetch(url, { next: { revalidate } });

  if (!res.ok) {
    throw new TreasuryApiError(
      `Treasury API request failed (${res.status} ${res.statusText}) for ${path}`
    );
  }

  const json = (await res.json()) as FiscalDataResponse<T>;
  return json.data;
}

export interface GetAuctionsParams {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  securityType?: "Bill" | "Note" | "Bond" | "TIPS" | "FRN";
}

export async function getAuctions({
  start,
  end,
  securityType,
}: GetAuctionsParams): Promise<TreasuryAuctionRecord[]> {
  const filters = [`auction_date:gte:${start}`, `auction_date:lte:${end}`];
  if (securityType) {
    filters.push(`security_type:eq:${securityType}`);
  }

  return fetchFiscalData<TreasuryAuctionRecord>(
    "/auctions_query",
    {
      fields: AUCTION_FIELDS.join(","),
      filter: filters.join(","),
      sort: "-auction_date",
      "page[size]": "10000",
    },
    600
  );
}

export async function getUpcomingAuctions(): Promise<UpcomingAuctionRecord[]> {
  const today = new Date().toISOString().slice(0, 10);

  return fetchFiscalData<UpcomingAuctionRecord>(
    "/upcoming_auctions",
    {
      fields: UPCOMING_AUCTION_FIELDS.join(","),
      filter: `auction_date:gte:${today}`,
      sort: "auction_date",
      "page[size]": "500",
    },
    3600
  );
}
