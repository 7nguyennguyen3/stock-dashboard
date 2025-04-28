import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";

interface StockInfo {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: string | null;
}

interface FinnhubQuoteResponse {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

async function fetchFinnhubQuote(symbol: string): Promise<StockInfo | null> {
  if (!API_KEY) {
    console.error("FINNHUB_API_KEY environment variable is not set.");
    return null;
  }

  const url = `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`;

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      if (response.status === 401) {
        console.error(
          `Finnhub API Error for ${symbol}: Unauthorized. Check your API key.`
        );
      } else if (response.status === 429) {
        console.warn(`Finnhub API Error for ${symbol}: Rate limit exceeded.`);
      } else if (response.status === 404) {
        console.warn(`Finnhub API: Symbol ${symbol} not found (or other 404).`);
      } else {
        console.error(
          `HTTP error fetching ${symbol} from Finnhub: ${response.status} ${response.statusText}`
        );
      }
      if (response.status === 404 || response.status === 400) {
        throw new Error(`Symbol '${symbol}' not found or invalid.`);
      }
      throw new Error(
        `Finnhub API request failed with status ${response.status}.`
      );
    }

    const data: FinnhubQuoteResponse = await response.json();

    if (
      data.c === undefined ||
      data.d === undefined ||
      data.dp === undefined ||
      data.pc === 0
    ) {
      console.warn(
        `Incomplete or zero data received for ${symbol} from Finnhub. It might be an invalid symbol or API issue. Data:`,
        data
      );
      if (data.c === undefined || data.c === 0) {
        throw new Error(
          `Invalid data received for symbol '${symbol}'. It might not be a valid stock ticker.`
        );
      }
    }

    const formattedPercentChange = `${data.dp >= 0 ? "+" : ""}${data.dp.toFixed(
      2
    )}%`;

    return {
      symbol: symbol,
      price: data.c,
      change: data.d,
      changePercent: formattedPercentChange,
    };
  } catch (error: any) {
    console.error(
      `Failed to fetch or process data for ${symbol} from Finnhub:`,
      error?.message || error
    );
    throw error;
  }
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Finnhub API key is not configured on the server." },
      { status: 503 }
    );
  }

  let symbol: string;

  try {
    const body = await request.json();
    symbol = body.symbol;

    if (typeof symbol !== "string" || !symbol.trim()) {
      return NextResponse.json(
        { error: "Invalid or missing 'symbol' in request body." },
        { status: 400 }
      );
    }
    symbol = symbol.trim().toUpperCase();
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse request body. Ensure it's valid JSON." },
      { status: 400 }
    );
  }

  try {
    const stockInfo = await fetchFinnhubQuote(symbol);

    return NextResponse.json(stockInfo, { status: 200 });
  } catch (error: any) {
    console.error(
      `Error in POST /api/stock/new handler for symbol ${symbol}:`,
      error?.message || error
    );

    let errorMessage = `Failed to fetch data for symbol '${symbol}'.`;
    let status = 500;

    if (
      error.message?.includes("not found or invalid") ||
      error.message?.includes("Invalid data")
    ) {
      errorMessage = error.message;
      status = 404;
    } else if (error.message?.includes("Finnhub API request failed")) {
      errorMessage = "Could not retrieve data from the stock provider.";
      status = 502;
    } else if (error.message?.includes("Rate limit exceeded")) {
      errorMessage = "API rate limit exceeded. Please try again later.";
      status = 429;
    }

    return NextResponse.json({ error: errorMessage }, { status: status });
  }
}
