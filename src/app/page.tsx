"use client";

import React, {
  useState,
  useEffect,
  KeyboardEvent,
  useMemo,
  useRef,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Terminal,
  Loader2,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

interface StockInfo {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: string | null;
}

const StockTableSkeleton = ({ rows = 8 }: { rows?: number }) => (
  <div className="shadow overflow-auto border-b border-gray-200 sm:rounded-lg">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
            Symbol
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
            Price
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
            Change
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
            % Change
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, index) => (
          <tr key={index} className="bg-white">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <Skeleton className="h-5 w-16" />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
              <Skeleton className="h-5 w-20" />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
              <Skeleton className="h-5 w-16" />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
              <Skeleton className="h-5 w-16" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

type SortKey = keyof StockInfo;
type SortDirection = "ascending" | "descending";
interface SortConfig {
  key: SortKey | null;
  direction: SortDirection;
}

const HomePage = () => {
  const [stockData, setStockData] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [numberOfStocksExpected] = useState<number>(8);
  const [newSymbol, setNewSymbol] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "symbol",
    direction: "ascending",
  });
  const [recentlyAddedSymbols, setRecentlyAddedSymbols] = useState<Set<string>>(
    new Set()
  );
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/stock");
        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch {}
          throw new Error(errorMsg);
        }
        const data: StockInfo[] = await response.json();
        const validatedData = data.filter((stock) => stock && stock.symbol);
        setStockData(validatedData);
      } catch (e: any) {
        setError(`Failed to fetch initial stock data: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const timeouts = timeoutRefs.current;
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const handleAddStock = async (symbolToAdd: string) => {
    const upperCaseSymbol = symbolToAdd.trim().toUpperCase();
    if (!upperCaseSymbol) {
      setAddError("Please enter a stock symbol.");
      return;
    }
    if (stockData.some((stock) => stock.symbol === upperCaseSymbol)) {
      setAddError(`${upperCaseSymbol} is already in the list.`);
      return;
    }
    setIsAdding(true);
    setAddError(null);
    try {
      const response = await fetch("/api/stock/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: upperCaseSymbol }),
      });
      if (!response.ok) {
        let errorMsg = `Failed to add ${upperCaseSymbol}. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = `${errorMsg} - ${errorData.error || "Unknown error"}`;
        } catch {}
        throw new Error(errorMsg);
      }
      const newStockInfo: StockInfo = await response.json();
      if (timeoutRefs.current.has(upperCaseSymbol)) {
        clearTimeout(timeoutRefs.current.get(upperCaseSymbol)!);
        timeoutRefs.current.delete(upperCaseSymbol);
      }
      setRecentlyAddedSymbols((prevSet) =>
        new Set(prevSet).add(upperCaseSymbol)
      );
      setStockData((prevData) => [...prevData, newStockInfo]);
      setNewSymbol("");
      const timeoutId = setTimeout(() => {
        setRecentlyAddedSymbols((prevSet) => {
          const nextSet = new Set(prevSet);
          nextSet.delete(upperCaseSymbol);
          return nextSet;
        });
        timeoutRefs.current.delete(upperCaseSymbol);
      }, 3000);
      timeoutRefs.current.set(upperCaseSymbol, timeoutId);
    } catch (e: any) {
      setAddError(e.message || `Failed to add stock ${upperCaseSymbol}.`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddStock(newSymbol);
    }
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedStockData = useMemo(() => {
    let sortableItems = [...stockData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        const parsePercent = (val: string | null): number | null => {
          if (val === null || val === "N/A" || typeof val !== "string")
            return null;
          const num = parseFloat(val.replace("%", "").replace("+", ""));
          return isNaN(num) ? null : num;
        };
        let comparison = 0;
        switch (sortConfig.key) {
          case "symbol":
            comparison = (aValue as string).localeCompare(bValue as string);
            break;
          case "price":
          case "change":
            const numA = aValue as number | null;
            const numB = bValue as number | null;
            if (numA === null && numB === null) comparison = 0;
            else if (numA === null) comparison = -1;
            else if (numB === null) comparison = 1;
            else comparison = numA - numB;
            break;
          case "changePercent":
            const percentA = parsePercent(aValue as string | null);
            const percentB = parsePercent(bValue as string | null);
            if (percentA === null && percentB === null) comparison = 0;
            else if (percentA === null) comparison = -1;
            else if (percentB === null) comparison = 1;
            else comparison = percentA - percentB;
            break;
          default:
            comparison = 0;
        }
        return sortConfig.direction === "descending"
          ? comparison * -1
          : comparison;
      });
    }
    return sortableItems;
  }, [stockData, sortConfig]);

  const getChangeColorClass = (change: number | null): string => {
    if (change == null) return "text-gray-500";
    return change >= 0 ? "text-green-600" : "text-red-600";
  };

  const renderSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    }
    if (sortConfig.direction === "ascending") {
      return <ArrowUp className="ml-2 h-4 w-4 text-gray-700" />;
    } else {
      return <ArrowDown className="ml-2 h-4 w-4 text-gray-700" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 font-sans max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Stock Dashboard</h1>

      <div className="mb-6 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Enter Stock Symbol (e.g., AAPL)"
          value={newSymbol}
          onChange={(e) => {
            setNewSymbol(e.target.value);
            setAddError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={isAdding}
          className="max-w-xs"
        />
        <Button
          onClick={() => handleAddStock(newSymbol)}
          disabled={isAdding || !newSymbol.trim()}
          variant="default"
          size="sm"
          style={{ minWidth: "80px" }}
          className="flex items-center justify-center"
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>

      {addError && !isAdding && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Add Error</AlertTitle>
          <AlertDescription>{addError}</AlertDescription>
        </Alert>
      )}

      {loading && <StockTableSkeleton rows={numberOfStocksExpected} />}

      {error && !loading && (
        <Alert variant="destructive" className="mt-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Initial Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => requestSort("symbol")}
                  aria-sort={
                    sortConfig.key === "symbol" ? sortConfig.direction : "none"
                  }
                >
                  <div className="flex items-center">
                    Symbol
                    {renderSortIcon("symbol")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => requestSort("price")}
                  aria-sort={
                    sortConfig.key === "price" ? sortConfig.direction : "none"
                  }
                >
                  <div className="flex items-center justify-end">
                    Price
                    {renderSortIcon("price")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => requestSort("change")}
                  aria-sort={
                    sortConfig.key === "change" ? sortConfig.direction : "none"
                  }
                >
                  <div className="flex items-center justify-end">
                    Change
                    {renderSortIcon("change")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => requestSort("changePercent")}
                  aria-sort={
                    sortConfig.key === "changePercent"
                      ? sortConfig.direction
                      : "none"
                  }
                >
                  <div className="flex items-center justify-end">
                    % Change
                    {renderSortIcon("changePercent")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStockData.map((stock) => (
                <tr key={stock.symbol}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stock.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                    {stock.price !== null
                      ? `$${stock.price.toFixed(2)}`
                      : "N/A"}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getChangeColorClass(
                      stock.change
                    )}`}
                  >
                    {stock.change !== null ? stock.change.toFixed(2) : "N/A"}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getChangeColorClass(
                      stock.change
                    )}`}
                  >
                    {stock.changePercent !== null ? stock.changePercent : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HomePage;
