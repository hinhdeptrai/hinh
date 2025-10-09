"use client";

import { useEffect, useState } from "react";
import { AuthWrapper } from "@/components/auth-wrapper";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { DEFAULT_SYMBOLS, BLOCKED_SYMBOLS } from "@/lib/symbols";
import { cn } from "@/lib/utils";

interface IndicatorResult {
  type: string;
  name: string;
  description: string;
  winRate: number;
  signal: string;
  lastSignal: string;
  lastSignalTime: string;
  lastSignalPrice: number;
  barsSinceSignal: number;
  isSignalFresh: boolean;
  confidence: number;
  reasons: string[];
  entryLevels: {
    pos: number;
    entry: number;
    sl: number;
    tp1: number;
    tp2: number;
    tp3: number;
  };
  lastSignalOutcome?: string;
}

interface TrendData {
  success: boolean;
  symbol: string;
  timeframe: string;
  altTimeframe: string;
  currentPrice: number;
  timestamp: string;
  consensus: {
    overall: "BULLISH" | "BEARISH" | "NEUTRAL";
    strength: number;
    avgWinRate: number;
    buyCount: number;
    sellCount: number;
    noneCount: number;
    freshBuyCount: number;
    freshSellCount: number;
  };
  altConsensus: {
    overall: "BULLISH" | "BEARISH" | "NEUTRAL";
    strength: number;
    avgWinRate: number;
    buyCount: number;
    sellCount: number;
    noneCount: number;
    freshBuyCount: number;
    freshSellCount: number;
  };
  indicators: IndicatorResult[];
  altIndicators: IndicatorResult[];
}

function SymbolTrendPage() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "alt">("main");
  const [open, setOpen] = useState(false);

  // Filter out blocked symbols
  const availableSymbols = DEFAULT_SYMBOLS.filter(
    (s) => !BLOCKED_SYMBOLS.includes(s)
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/symbol-trend?symbol=${symbol}&timeframe=${timeframe}&altTimeframe=1h`
      );
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, symbol, timeframe]);

  const getOverallColor = (trend: string) => {
    switch (trend) {
      case "BULLISH":
        return "text-green-600 bg-green-50 border-green-200";
      case "BEARISH":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getOverallIcon = (trend: string) => {
    switch (trend) {
      case "BULLISH":
        return <TrendingUp className="h-8 w-8" />;
      case "BEARISH":
        return <TrendingDown className="h-8 w-8" />;
      default:
        return <Minus className="h-8 w-8" />;
    }
  };

  const getSignalBadge = (signal: string, isFresh: boolean) => {
    if (!isFresh) {
      return (
        <Badge variant="outline" className="opacity-50">
          Old {signal}
        </Badge>
      );
    }

    switch (signal) {
      case "BUY":
        return <Badge className="bg-green-600">🟢 BUY</Badge>;
      case "SELL":
        return <Badge className="bg-red-600">🔴 SELL</Badge>;
      default:
        return <Badge variant="secondary">⚪ NONE</Badge>;
    }
  };

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome || outcome === "NONE") return null;

    if (outcome.startsWith("TP")) {
      return <Badge className="bg-green-500 ml-2">✅ {outcome}</Badge>;
    }
    if (outcome === "SL") {
      return <Badge className="bg-red-500 ml-2">❌ SL</Badge>;
    }
    return null;
  };

  const formatPrice = (n?: number | null) => {
    if (n == null) return "-";
    const v = Number(n);
    if (!isFinite(v)) return "-";
    return v >= 1000
      ? v.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        })
      : v.toFixed(8).replace(/\.?0+$/, "");
  };

  return (
    <AuthWrapper>
      <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">
                  📊 Symbol Trend Analysis
                </CardTitle>
                <CardDescription className="text-sm">
                  Phân tích xu hướng crypto qua tất cả các chỉ báo
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-[140px] sm:w-[180px] justify-between text-sm"
                    >
                      <span className="truncate">{symbol.replace("USDT", "")}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Search symbol..." />
                      <CommandList>
                        <CommandEmpty>No symbol found.</CommandEmpty>
                        <CommandGroup>
                          {availableSymbols.map((sym) => (
                            <CommandItem
                              key={sym}
                              value={sym}
                              onSelect={(currentValue) => {
                                setSymbol(currentValue.toUpperCase());
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  symbol === sym ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {sym.replace("USDT", "")}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-[100px] sm:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m">15m</SelectItem>
                    <SelectItem value="1h">1h</SelectItem>
                    <SelectItem value="4h">4h</SelectItem>
                    <SelectItem value="1d">1d</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="text-xs sm:text-sm"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-1 sm:mr-2 ${
                      autoRefresh ? "animate-spin" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">{autoRefresh ? "Auto" : "Manual"}</span>
                </Button>
                <Button size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        )}

        {/* Main Content */}
        {data && (
          <>
            {/* Dual Timeframe Consensus */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Main Timeframe Consensus */}
              <Card
                className={`border-2 ${getOverallColor(
                  data.consensus.overall
                )}`}
              >
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3">
                    {getOverallIcon(data.consensus.overall)}
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-bold truncate">
                        {data.consensus.overall}
                      </div>
                      <div className="text-xs sm:text-sm font-normal opacity-75">
                        {data.symbol.replace("USDT", "")} | {data.timeframe} | {data.consensus.strength}% | WR: {data.consensus.avgWinRate}%
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-base sm:text-xl font-bold font-mono break-all">
                        ${formatPrice(data.currentPrice)}
                      </div>
                      <div className="text-xs text-gray-600">Price</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-base sm:text-xl font-bold text-green-600">
                        {data.consensus.freshBuyCount}
                      </div>
                      <div className="text-xs text-gray-600">Fresh BUY</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-base sm:text-xl font-bold text-red-600">
                        {data.consensus.freshSellCount}
                      </div>
                      <div className="text-xs text-gray-600">Fresh SELL</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-base sm:text-xl font-bold">
                        {data.indicators.length}
                      </div>
                      <div className="text-xs text-gray-600">Indicators</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alt Timeframe Consensus */}
              <Card
                className={`border-2 ${getOverallColor(
                  data.altConsensus.overall
                )}`}
              >
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3">
                    {getOverallIcon(data.altConsensus.overall)}
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-bold truncate">
                        {data.altConsensus.overall}
                      </div>
                      <div className="text-xs sm:text-sm font-normal opacity-75">
                        {data.symbol.replace("USDT", "")} | {data.altTimeframe} | {data.altConsensus.strength}% | WR: {data.altConsensus.avgWinRate}%
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-base sm:text-xl font-bold break-all">
                        ${formatPrice(data.currentPrice)}
                      </div>
                      <div className="text-xs text-gray-600">Price</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-base sm:text-xl font-bold text-green-600">
                        {data.altConsensus.freshBuyCount}
                      </div>
                      <div className="text-xs text-gray-600">Fresh BUY</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-base sm:text-xl font-bold text-red-600">
                        {data.altConsensus.freshSellCount}
                      </div>
                      <div className="text-xs text-gray-600">Fresh SELL</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-base sm:text-xl font-bold">
                        {data.altIndicators.length}
                      </div>
                      <div className="text-xs text-gray-600">Indicators</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeframe Tabs */}
            <div className="flex gap-2 border-b overflow-x-auto">
              <button
                onClick={() => setActiveTab("main")}
                className={`px-3 sm:px-4 py-2 font-medium transition whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "main"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                📊 {data.timeframe}
              </button>
              <button
                onClick={() => setActiveTab("alt")}
                className={`px-3 sm:px-4 py-2 font-medium transition whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "alt"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ⏱️ {data.altTimeframe}
              </button>
            </div>

            {/* Individual Indicators */}
            <div className="grid gap-3 sm:gap-4">
              {(activeTab === "main" ? data.indicators : data.altIndicators)
                .sort((a, b) => {
                  // Sort by: fresh signals first, then by win rate
                  if (a.isSignalFresh && !b.isSignalFresh) return -1;
                  if (!a.isSignalFresh && b.isSignalFresh) return 1;
                  return b.winRate - a.winRate;
                })
                .map((ind) => (
                  <Card
                    key={ind.type}
                    className={
                      ind.isSignalFresh ? "border-2 border-blue-300" : ""
                    }
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <CardTitle className="text-base sm:text-lg">
                              {ind.name}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">{ind.winRate}% WR</Badge>
                            {ind.isSignalFresh && (
                              <Badge className="bg-blue-500 text-xs">✨ Fresh</Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs sm:text-sm">
                            {ind.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getSignalBadge(ind.lastSignal, ind.isSignalFresh)}
                          {getOutcomeBadge(ind.lastSignalOutcome)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                        {/* Signal Info */}
                        <div>
                          <div className="font-semibold mb-1">Last Signal</div>
                          <div className="text-gray-600 text-xs">
                            {ind.lastSignalTime
                              ? new Date(ind.lastSignalTime).toLocaleString(
                                  "vi-VN", {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }
                                )
                              : "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ind.barsSinceSignal} bars ago
                          </div>
                        </div>

                        {/* Entry Price */}
                        <div>
                          <div className="font-semibold mb-1">Entry Price</div>
                          <div className="text-gray-600 font-mono break-all">
                            ${formatPrice(ind.lastSignalPrice)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ind.entryLevels.pos === 1
                              ? "LONG"
                              : ind.entryLevels.pos === -1
                              ? "SHORT"
                              : "NONE"}
                          </div>
                        </div>

                        {/* Targets */}
                        <div>
                          <div className="font-semibold mb-1">Targets</div>
                          <div className="text-xs space-y-0.5 font-mono">
                            <div className="text-green-600 break-all">
                              TP1: ${formatPrice(ind.entryLevels.tp1)}
                            </div>
                            <div className="text-green-600 break-all">
                              TP2: ${formatPrice(ind.entryLevels.tp2)}
                            </div>
                            <div className="text-green-600 break-all">
                              TP3: ${formatPrice(ind.entryLevels.tp3)}
                            </div>
                          </div>
                        </div>

                        {/* Stop Loss */}
                        <div>
                          <div className="font-semibold mb-1">Stop Loss</div>
                          <div className="text-red-600 font-mono break-all">
                            ${formatPrice(ind.entryLevels.sl)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Confidence: {ind.confidence}%
                          </div>
                        </div>
                      </div>

                      {/* Reasons */}
                      {ind.reasons && ind.reasons.length > 0 && (
                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                          <div className="font-semibold text-xs sm:text-sm mb-2">
                            Reasons:
                          </div>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {ind.reasons.map((reason, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </>
        )}
      </div>
    </AuthWrapper>
  );
}

export default SymbolTrendPage;
