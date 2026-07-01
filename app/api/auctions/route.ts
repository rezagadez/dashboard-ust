import { NextRequest, NextResponse } from "next/server";
import { getAuctions } from "@/lib/treasury";

const VALID_TYPES = ["Bill", "Note", "Bond", "TIPS", "FRN"] as const;

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
  const type = searchParams.get("type");

  if (type && !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const data = await getAuctions({
      start,
      end,
      securityType: type as (typeof VALID_TYPES)[number] | undefined,
    });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
