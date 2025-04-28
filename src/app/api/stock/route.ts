import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";

interface StockInfo {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
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
      } else {
        console.error(
          `HTTP error fetching ${symbol} from Finnhub: ${response.status} ${response.statusText}`
        );
      }
      return null;
    }

    const data: FinnhubQuoteResponse = await response.json();

    if (
      data.c === undefined ||
      data.d === undefined ||
      data.dp === undefined ||
      data.pc === 0
    ) {
      console.warn(
        `Incomplete or potentially invalid data received for ${symbol} from Finnhub:`,
        data
      );
      if (data.c === undefined) return null;
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
  } catch (error) {
    console.error(
      `Failed to fetch or process data for ${symbol} from Finnhub:`,
      error
    );
    return null;
  }
}

export async function GET(_request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Finnhub API key is not configured on the server." },
      { status: 500 }
    );
  }

  const stocksToFetchSymbols = [
    "AAPL",
    "GOOGL",
    "MSFT",
    "AMZN",
    "TSLA",
    "NVDA",
    "META",
    "IBM",
  ];

  try {
    const fetchPromises = stocksToFetchSymbols.map((symbol) =>
      fetchFinnhubQuote(symbol)
    );

    const results = await Promise.allSettled(fetchPromises);

    const successfulData: StockInfo[] = results
      .filter(
        (result): result is PromiseFulfilledResult<StockInfo | null> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value)
      .filter((stockInfo): stockInfo is StockInfo => stockInfo !== null);

    return NextResponse.json(successfulData);
  } catch (error) {
    console.error("Error in GET /api/stock handler (Finnhub):", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching stock data." },
      { status: 500 }
    );
  }
}
