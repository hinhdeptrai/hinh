"use client";
import { useEffect, useMemo, useState } from "react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { IndicatorDetails } from "@/components/indicator-details";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";

type IndicatorResponse = Awaited<
  ReturnType<typeof import("@/lib/indicator").getIndicator>
>;

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "XRPUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "DOGEUSDT",
  "TRXUSDT",
  "ADAUSDT",
  "HYPEUSDT",
  "LINKUSDT",
  "SUIUSDT",
  "AVAXUSDT",
  "XLMUSDT",
  "BCHUSDT",
  "HBARUSDT",
  "LEOUSDT",
  "LTCUSDT",
  "TONUSDT",
  "CROUSDT",
  "SHIBUSDT",
  "DOTUSDT",
  "UNIUSDT",
  "XMRUSDT",
  "MNTUSDT",
  "WLFIUSDT",
  "ENAUSDT",
  "AAVEUSDT",
  "PEPEUSDT",
  "OKBUSDT",
  "BGBUSDT",
  "TAOUSDT",
  "NEARUSDT",
  "ONDOUSDT",
  "ETCUSDT",
  "APTUSDT",
  "WLDUSDT",
  "IPUSDT",
  "PIUSDT",
  "PUMPUSDT",
  "POLUSDT",
  "MUSDT",
  "ARBUSDT",
  "ICPUSDT",
  "KASUSDT",
  "ATOMUSDT",
  "MYXUSDT",
  "VETUSDT",
  "PENGUUSDT",
  "ALGOUSDT",
  "KCSUSDT",
  "SEIUSDT",
  "RENDERUSDT",
  "BONKUSDT",
  "SKYUSDT",
  "FLRUSDT",
  "TRUMPUSDT",
  "FILUSDT",
  "JUPUSDT",
  "FETUSDT",
  "INJUSDT",
  "OPUSDT",
  "TIAUSDT",
  "PYUSDUSDT",
  "QNTUSDT",
  "IMXUSDT",
  "SPXUSDT",
  "AEROUSDT",
  "STXUSDT",
  "PAXGUSDT",
  "LDOUSDT",
  "CRVUSDT",
  "GRTUSDT",
  "KAIAUSDT",
  "PYTHUSDT",
  "CFXUSDT",
  "FLOKIUSDT",
  "RAYUSDT",
  "WIFUSDT",
  "SUSDT",
  "ENSUSDT",
  "CAKEUSDT",
  "NEXOUSDT",
  "PENDLEUSDT",
  "ZECUSDT",
  "FARTCOINUSDT",
  "FORMUSDT",
  "XTZUSDT",
  "THETAUSDT",
  "VIRTUALUSDT",
  "ATHUSDT",
  "GALAUSDT",
];
const BLOCKED_SYMBOLS = [
  "FARTCOINUSDT",
  "ATHUSDT",
  "XAUTUSDT",
  "AEROUSDT",
  "SPXUSDT",
  "PYUSDUSDT",
  "FLRUSDT",
  "SKYUSDT",
  "KCSUSDT",
  "MYXUSDT",
  "KASUSDT",
  "MUSDT",
  "PIUSDT",
  "IPUSDT",
  "BGBUSDT",
  "OKBUSDT",
  "MNTUSDT",
  "CROUSDT",
  "LEOUSDT",
  "HYPEUSDT",
];

export default function Page() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [data, setData] = useState<
    Record<string, IndicatorResponse | { error: string }>
  >({});
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [newSymbol, setNewSymbol] = useState("");
  const [mainTF, setMainTF] = useState("4h");
  const [altTF, setAltTF] = useState("1h");

  // Filter states
  const [signalFilter, setSignalFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [volumeFilter, setVolumeFilter] = useState<string>("all");
  const [freshFilter, setFreshFilter] = useState<string>("all");
  const [entryFilter, setEntryFilter] = useState<string>("all"); // Filter mới cho entry status

  // Sort states
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Global indicator state
  const [globalIndicator, setGlobalIndicator] = useState<string>("FIBONACCI_ALGO");

  const ALT_NONE = "none";
  const intervals = useMemo(
    () => [mainTF, altTF].filter(Boolean),
    [mainTF, altTF]
  );
  const visibleSymbols = useMemo(
    () => symbols.filter((s) => !BLOCKED_SYMBOLS.includes(s)),
    [symbols]
  );

  // Sắp xếp và filter symbols với priority: có signal trước, fresh signal trước, sau đó theo alphabet
  const sortedVisibleSymbols = useMemo(() => {
    const symbolsWithData = visibleSymbols.map((symbol) => {
      const row = data[symbol] as any;
      return {
        symbol,
        hasSignal: row && !row.error && row.signal && row.signal !== "NONE",
        isFresh: row && !row.error && row.isSignalFresh,
        signal: row && !row.error ? row.signal : "NONE",
        lastSignal: row && !row.error ? row.lastSignal : "NONE",
        outcome: row && !row.error ? row.lastSignalOutcome : "NONE",
        volumeConfirmed: row && !row.error ? row.volumeConfirmed : false,
        data: row,
      };
    });

    // Apply filters
    const filtered = symbolsWithData.filter((item) => {
      // Signal filter (trở lại logic cũ)
      if (signalFilter !== "all") {
        if (signalFilter === "active" && !item.hasSignal) return false;
        if (signalFilter === "buy" && item.signal !== "BUY") return false;
        if (signalFilter === "sell" && item.signal !== "SELL") return false;
        if (signalFilter === "none" && item.signal !== "NONE") return false;
      }

      // Entry filter (filter mới)
      if (entryFilter !== "all") {
        const hasLastSignal = item.lastSignal && item.lastSignal !== "NONE";
        const hasOutcome = item.outcome && item.outcome !== "NONE";

        if (entryFilter === "not_hit" && (!hasLastSignal || hasOutcome))
          return false; // Chưa chạm entry
        if (entryFilter === "hit" && (!hasLastSignal || !hasOutcome))
          return false; // Đã chạm entry
      }

      // Outcome filter
      if (outcomeFilter !== "all") {
        if (
          outcomeFilter === "win" &&
          (!item.outcome || item.outcome === "NONE" || item.outcome === "SL")
        )
          return false;
        if (outcomeFilter === "loss" && item.outcome !== "SL") return false;
        if (
          outcomeFilter === "pending" &&
          item.outcome &&
          item.outcome !== "NONE"
        )
          return false;
      }

      // Volume filter
      if (volumeFilter !== "all") {
        if (volumeFilter === "confirmed" && !item.volumeConfirmed) return false;
        if (volumeFilter === "weak" && item.volumeConfirmed) return false;
      }

      // Fresh filter
      if (freshFilter !== "all") {
        if (freshFilter === "fresh" && !item.isFresh) return false;
        if (freshFilter === "old" && item.isFresh) return false;
      }

      return true;
    });

    return filtered
      .sort((a, b) => {
        // Apply custom sort if specified
        if (sortField && sortField !== "") {
          let aValue: any, bValue: any;

          switch (sortField) {
            case "symbol":
              aValue = a.symbol;
              bValue = b.symbol;
              break;
            case "price":
              aValue = a.data?.close || 0;
              bValue = b.data?.close || 0;
              break;
            case "signal":
              const signalOrder = { BUY: 2, SELL: 1, NONE: 0 };
              aValue = signalOrder[a.signal as keyof typeof signalOrder] || 0;
              bValue = signalOrder[b.signal as keyof typeof signalOrder] || 0;
              break;
            case "age":
              aValue = a.data?.signalAgeMinutes || 0;
              bValue = b.data?.signalAgeMinutes || 0;
              break;
            case "bars":
              aValue = a.data?.barsSinceSignal || 0;
              bValue = b.data?.barsSinceSignal || 0;
              break;
            case "rsi":
              aValue = a.data?.rsi2Sma7 || 0;
              bValue = b.data?.rsi2Sma7 || 0;
              break;
            case "adx":
              aValue = a.data?.adx || 0;
              bValue = b.data?.adx || 0;
              break;
            default:
              aValue = 0;
              bValue = 0;
          }

          if (typeof aValue === "string" && typeof bValue === "string") {
            const result = aValue.localeCompare(bValue);
            return sortDirection === "asc" ? result : -result;
          } else {
            const result = (aValue as number) - (bValue as number);
            return sortDirection === "asc" ? result : -result;
          }
        }

        // Default sorting logic (unchanged)
        // 1. Có signal hiện tại trước (BUY/SELL)
        if (a.hasSignal !== b.hasSignal) {
          return a.hasSignal ? -1 : 1;
        }

        // 2. Trong nhóm có signal, fresh signal trước
        if (a.hasSignal && b.hasSignal && a.isFresh !== b.isFresh) {
          return a.isFresh ? -1 : 1;
        }

        // 3. Trong nhóm NONE, ưu tiên có lastSignal
        if (!a.hasSignal && !b.hasSignal) {
          const aHasLastSignal = a.lastSignal && a.lastSignal !== "NONE";
          const bHasLastSignal = b.lastSignal && b.lastSignal !== "NONE";
          if (aHasLastSignal !== bHasLastSignal) {
            return aHasLastSignal ? -1 : 1;
          }
        }

        // 4. Cuối cùng sắp xếp theo alphabet
        return a.symbol.localeCompare(b.symbol);
      })
      .map((item) => item.symbol);
  }, [
    visibleSymbols,
    data,
    signalFilter,
    outcomeFilter,
    volumeFilter,
    freshFilter,
    entryFilter,
    sortField,
    sortDirection,
  ]);

  const fetchOne = async (symbol: string) => {
    // Use new multi-indicator API
    const res = await fetch('/api/scan-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol,
        timeframe: mainTF,
        indicator_type: globalIndicator,
        limit: 500,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    return result.data as IndicatorResponse;
  };

  const load = async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(
        sortedVisibleSymbols.map(async (s) => {
          try {
            const d = await fetchOne(s);
            return [s, d] as const;
          } catch (e: any) {
            return [s, { error: e?.message || "error" }] as const;
          }
        })
      );
      setData(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (!auto) return;
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), auto, intervals.join(","), globalIndicator]); // Auto-reload when indicator changes

  const onAddSymbol = () => {
    const s = newSymbol.toUpperCase().trim();
    if (!s) return;
    if (!/^[A-Z0-9]{3,}$/.test(s)) return alert("Symbol không hợp lệ");
    if (symbols.includes(s)) return;
    setSymbols((prev) => [...prev, s]);
    setNewSymbol("");
  };

  const onRemove = (s: string) =>
    setSymbols((prev) => prev.filter((x) => x !== s));

  const queueSignal = async (row: IndicatorResponse) => {
    try {
      const payload = {
        symbol: row.symbol,
        timeframe: row.mainTF,
        signal_type: row.signal,
        entry_price: row.lastSignalPrice || row.close,
        sl_price: row.entryLevels?.sl,
        tp1_price: row.entryLevels?.tp1,
        tp2_price: row.entryLevels?.tp2,
        tp3_price: row.entryLevels?.tp3,
        tp4_price: (row.entryLevels as any)?.tp4,
        tp5_price: (row.entryLevels as any)?.tp5,
        tp6_price: (row.entryLevels as any)?.tp6,
        signal_time: row.lastSignalTime || new Date().toISOString(),
        is_fresh: row.isSignalFresh,
        volume_confirmed: row.volumeConfirmed,
      };

      console.log("Queueing signal:", payload);

      const res = await fetch("/api/queue-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        console.log("Queue signal result:", result);
        alert(
          `✅ Đã thêm vào queue!\n\n` +
          `Nến sẽ đóng lúc: ${result.data.candle_close_time_iso}\n` +
          `Thời gian chờ: ~${result.data.wait_time_minutes} phút`
        );
      } else {
        const error = await res.json();
        console.error("Queue signal error:", error);
        alert(`❌ Lỗi: ${error.error || "Unknown error"}`);
      }
    } catch (e: any) {
      console.error("Queue signal exception:", e);
      alert(`❌ Lỗi: ${e.message}`);
    }
  };

  const trackSignal = async (row: IndicatorResponse) => {
    try {
      // Important: Only track signals from confirmed (closed) candles
      // If barsSinceSignal is 0, the signal is on the current unclosed candle
      if (row.barsSinceSignal === 0) {
        const confirmed = confirm(
          "⚠️ Cảnh báo: Signal đang ở nến hiện tại chưa đóng!\n\n" +
          "Nến có thể thay đổi trước khi đóng, dẫn đến thời gian entry không chính xác.\n\n" +
          "Bạn có chắc chắn muốn track signal này không?"
        );
        if (!confirmed) return;
      }

      const payload = {
        action: "store",
        symbol: row.symbol,
        timeframe: row.mainTF,
        signal_type: row.signal,
        entry_price: row.lastSignalPrice || row.close,
        sl_price: row.entryLevels?.sl,
        tp1_price: row.entryLevels?.tp1,
        tp2_price: row.entryLevels?.tp2,
        tp3_price: row.entryLevels?.tp3,
        tp4_price: (row.entryLevels as any)?.tp4,
        tp5_price: (row.entryLevels as any)?.tp5,
        tp6_price: (row.entryLevels as any)?.tp6,
        entry_time: row.lastSignalTime || new Date().toISOString(),
        is_fresh: row.isSignalFresh,
        volume_confirmed: row.volumeConfirmed,
      };

      console.log("Tracking signal:", payload);

      const res = await fetch("/api/track-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Track signal response:", res.status, res.ok);

      if (res.ok) {
        const result = await res.json();
        console.log("Track signal result:", result);
        alert("✅ Đã lưu signal vào danh sách theo dõi!");
      } else {
        const error = await res.json();
        console.error("Track signal error:", error);
        alert(`❌ Lỗi: ${error.error || "Unknown error"}`);
      }
    } catch (e: any) {
      console.error("Track signal exception:", e);
      alert(`❌ Lỗi: ${e.message}`);
    }
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else {
        // Reset sort if clicking same field twice
        setSortField("");
        setSortDirection("desc");
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sortable header component
  const SortableHeader = ({
    field,
    children,
    className = "",
  }: {
    field: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "desc" ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  const summary = useMemo(() => {
    const rows = Object.values(data).filter(
      (d: any) => d && !("error" in d)
    ) as IndicatorResponse[];
    const buy = rows.filter((r) => r.signal === "BUY").length;
    const sell = rows.filter((r) => r.signal === "SELL").length;
    const fresh = rows.filter((r) => r.isSignalFresh).length;

    // Thống kê Win/Loss
    const totalSignals = rows.filter(
      (r) => r.lastSignal && r.lastSignal !== "NONE"
    ).length;
    const winSignals = rows.filter(
      (r) =>
        r.lastSignalOutcome &&
        r.lastSignalOutcome !== "NONE" &&
        r.lastSignalOutcome !== "SL"
    ).length;
    const lossSignals = rows.filter((r) => r.lastSignalOutcome === "SL").length;
    const pendingSignals = rows.filter(
      (r) =>
        r.lastSignal &&
        r.lastSignal !== "NONE" &&
        (!r.lastSignalOutcome || r.lastSignalOutcome === "NONE")
    ).length;

    const winRate = totalSignals > 0 ? (winSignals / totalSignals) * 100 : 0;

    // Thống kê theo loại TP
    const tp1Hits = rows.filter((r) => r.lastSignalOutcome === "TP1").length;
    const tp2Hits = rows.filter((r) => r.lastSignalOutcome === "TP2").length;
    const tp3Hits = rows.filter((r) => r.lastSignalOutcome === "TP3").length;

    return {
      total: sortedVisibleSymbols.length,
      buy,
      sell,
      fresh,
      totalSignals,
      winSignals,
      lossSignals,
      pendingSignals,
      winRate,
      tp1Hits,
      tp2Hits,
      tp3Hits,
    };
  }, [data, sortedVisibleSymbols.length]);

  return (
    <AuthWrapper>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Bảng tín hiệu</h1>
              <p className="text-sm text-muted-foreground">
                Theo dõi tín hiệu BUY/SELL nhiều cặp Binance
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
              <div className="space-y-1">
                <Label>Khung chính</Label>
                <Select value={mainTF} onValueChange={setMainTF}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn TF" />
                  </SelectTrigger>
                  <SelectContent>
                    {["5m", "15m", "30m", "1h", "4h", "1d"].map((tf) => (
                      <SelectItem key={tf} value={tf}>
                        {tf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Khung phụ</Label>
                <Select
                  value={altTF || ALT_NONE}
                  onValueChange={(v) => setAltTF(v === ALT_NONE ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn TF" />
                  </SelectTrigger>
                  <SelectContent>
                    {[ALT_NONE, "5m","15m", "30m", "1h", "4h", "1d"].map((tf) => (
                      <SelectItem key={tf} value={tf}>
                        {tf === ALT_NONE ? "None" : tf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Thêm symbol</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    placeholder="VD: ARBUSDT"
                  />
                  <Button onClick={onAddSymbol} variant="secondary">
                    Thêm
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  Auto refresh
                  <Switch checked={auto} onCheckedChange={setAuto} />
                </Label>
                <Button onClick={load} disabled={loading} className="w-full">
                  {loading ? "Đang tải..." : "Làm mới"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {loading ? (
              // Loading skeleton for summary stats
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <Skeleton className="h-3 w-12 mb-2" />
                  <Skeleton className="h-7 w-8" />
                </div>
              ))
            ) : (
              <>
                <Stat label="Tổng" value={summary.total} />
                <Stat label="BUY" value={summary.buy} tone="success" />
                <Stat label="SELL" value={summary.sell} tone="destructive" />
                <Stat label="FRESH" value={summary.fresh} tone="info" />
              </>
            )}
          </div>

          {/* Thống kê Win/Loss */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                📊 Thống kê Signal Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                // Loading skeleton for performance stats
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div key={i} className="rounded-lg border p-3">
                        <Skeleton className="h-3 w-16 mb-2" />
                        <Skeleton className="h-6 w-8 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-full" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Tổng Signal
                      </div>
                      <div className="mt-1 text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {summary.totalSignals}
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 p-3">
                      <div className="text-xs text-green-600 dark:text-green-400">
                        WIN
                      </div>
                      <div className="mt-1 text-lg font-semibold text-green-700 dark:text-green-300">
                        {summary.winSignals}
                      </div>
                      <div className="text-xs text-green-500 dark:text-green-400">
                        TP1: {summary.tp1Hits} | TP2: {summary.tp2Hits} | TP3:{" "}
                        {summary.tp3Hits}
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800 p-3">
                      <div className="text-xs text-red-600 dark:text-red-400">
                        LOSS
                      </div>
                      <div className="mt-1 text-lg font-semibold text-red-700 dark:text-red-300">
                        {summary.lossSignals}
                      </div>
                      <div className="text-xs text-red-500 dark:text-red-400">
                        Hit SL
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-3">
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        PENDING
                      </div>
                      <div className="mt-1 text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                        {summary.pendingSignals}
                      </div>
                      <div className="text-xs text-yellow-500 dark:text-yellow-400">
                        Chờ kết quả
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-3">
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        Win Rate
                      </div>
                      <div className="mt-1 text-lg font-semibold text-purple-700 dark:text-purple-300">
                        {summary.winRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-purple-500 dark:text-purple-400">
                        Tỉ lệ thắng
                      </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-3">
                      <div className="text-xs text-indigo-600 dark:text-indigo-400">
                        Risk Ratio
                      </div>
                      <div className="mt-1 text-lg font-semibold text-indigo-700 dark:text-indigo-300">
                        {summary.lossSignals > 0
                          ? (summary.winSignals / summary.lossSignals).toFixed(
                              2
                            )
                          : summary.winSignals > 0
                          ? "∞"
                          : "0"}
                      </div>
                      <div className="text-xs text-indigo-500 dark:text-indigo-400">
                        Win:Loss
                      </div>
                    </div>
                  </div>

                  {/* Progress bar tổng quan */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        Performance Overview
                      </span>
                      <span className="text-muted-foreground">
                        {summary.totalSignals > 0
                          ? `${summary.winSignals}W / ${summary.lossSignals}L / ${summary.pendingSignals}P`
                          : "Chưa có dữ liệu"}
                      </span>
                    </div>
                    {summary.totalSignals > 0 && (
                      <div className="flex h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="bg-green-500 transition-all duration-300"
                          style={{
                            width: `${
                              (summary.winSignals / summary.totalSignals) * 100
                            }%`,
                          }}
                        />
                        <div
                          className="bg-red-500 transition-all duration-300"
                          style={{
                            width: `${
                              (summary.lossSignals / summary.totalSignals) * 100
                            }%`,
                          }}
                        />
                        <div
                          className="bg-yellow-500 transition-all duration-300"
                          style={{
                            width: `${
                              (summary.pendingSignals / summary.totalSignals) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-base">Danh sách cặp</CardTitle>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-sm font-medium">Indicator:</Label>
                  <Select value={globalIndicator} onValueChange={setGlobalIndicator}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Chọn indicator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MACD_BB">🏆 MACD + BB (78%)</SelectItem>
                      <SelectItem value="RSI_MACD_EMA">⭐ RSI + MACD + EMA (73%)</SelectItem>
                      <SelectItem value="FIBONACCI_ALGO">🎯 Fibonacci Algo</SelectItem>
                      <SelectItem value="RSI_VOLUME_BB">📊 RSI + Volume + BB (70%)</SelectItem>
                      <SelectItem value="SUPERTREND_EMA">📈 Supertrend + EMA (65%)</SelectItem>
                      <SelectItem value="EMA_CROSS_RSI">EMA Cross + RSI (60%)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label className="text-sm font-medium">Lọc:</Label>

                  <Select value={signalFilter} onValueChange={setSignalFilter}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Signal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="active">Có signal</SelectItem>
                      <SelectItem value="buy">BUY</SelectItem>
                      <SelectItem value="sell">SELL</SelectItem>
                      <SelectItem value="none">NONE</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={entryFilter} onValueChange={setEntryFilter}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Entry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="not_hit">Chưa chạm</SelectItem>
                      <SelectItem value="hit">Đã chạm</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={outcomeFilter}
                    onValueChange={setOutcomeFilter}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Kết quả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="win">WIN</SelectItem>
                      <SelectItem value="loss">LOSS</SelectItem>
                      <SelectItem value="pending">Chờ</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={volumeFilter} onValueChange={setVolumeFilter}>
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Volume" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="confirmed">Tốt</SelectItem>
                      <SelectItem value="weak">Yếu</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={freshFilter} onValueChange={setFreshFilter}>
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Fresh" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="fresh">Fresh</SelectItem>
                      <SelectItem value="old">Cũ</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSignalFilter("all");
                      setOutcomeFilter("all");
                      setVolumeFilter("all");
                      setFreshFilter("all");
                      setEntryFilter("all");
                      setSortField("");
                      setSortDirection("desc");
                    }}
                    className="text-xs"
                  >
                    Reset All
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    {sortedVisibleSymbols.length} / {visibleSymbols.length} coin
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="symbol">Symbol</SortableHeader>
                    <SortableHeader field="price" className="font-semibold">
                      Giá
                    </SortableHeader>
                    <SortableHeader field="signal">Tín hiệu</SortableHeader>
                    <TableHead>Last</TableHead>
                    <TableHead>TF</TableHead>
                    <TableHead>Trend</TableHead>
                    <SortableHeader field="age">Tuổi (giờ)</SortableHeader>
                    <SortableHeader field="bars">Cách nến</SortableHeader>
                    <SortableHeader field="rsi">RSI</SortableHeader>
                    <SortableHeader field="adx">ADX</SortableHeader>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? // Loading skeleton for all rows
                      Array.from({ length: 10 }, (_, i) => (
                        <TableRow key={`loading-${i}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-[18px] w-[18px] rounded-full" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-6 w-16" />
                              <Skeleton className="h-4 w-4 rounded-full" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-4 w-16" />
                              </div>
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-6 w-24" />
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-28" />
                                <div className="flex items-center gap-2">
                                  <Skeleton className="h-1.5 flex-1" />
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-8" />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Skeleton className="h-4 w-4" />
                              <Skeleton className="h-4 w-12" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-8" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-8" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-8" />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-12" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : sortedVisibleSymbols.map((s) => {
                        const row = data[s] as any;
                        if (!row)
                          return (
                            <TableRow key={s}>
                              <TableCell colSpan={11}>
                                <Skeleton className="h-6 w-full" />
                              </TableCell>
                            </TableRow>
                          );
                        if (row.error)
                          return (
                            <TableRow key={s} className="opacity-70">
                              <TableCell className="font-mono">{s}</TableCell>
                              <TableCell
                                colSpan={9}
                                className="text-destructive"
                              >
                                Lỗi: {row.error}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onRemove(s)}
                                >
                                  Xóa
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        const sig = row.signal;
                        const sigBadge =
                          sig === "BUY" ? (
                            <Badge variant="success" className="gap-1">
                              <ArrowUpRight className="h-3.5 w-3.5" /> BUY
                            </Badge>
                          ) : sig === "SELL" ? (
                            <Badge variant="destructive" className="gap-1">
                              <ArrowDownRight className="h-3.5 w-3.5" /> SELL
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Minus className="h-3.5 w-3.5" /> NONE
                            </Badge>
                          );
                        const age =
                          row.signalAgeMinutes != null
                            ? `${(row.signalAgeMinutes / 60).toFixed(1)}h`
                            : "-";
                        const trend = String(row.priceDirection || "");
                        return (
                          <TableRow key={s}>
                            <TableCell className="font-mono">
                              <span className="inline-flex items-center gap-2">
                                <Image
                                  src={logoUrl(row.symbol)}
                                  alt={baseFromSymbol(row.symbol)}
                                  width={18}
                                  height={18}
                                  className="rounded-full border"
                                />
                                <span className="uppercase tracking-wide">
                                  {row.symbol}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-lg text-foreground">
                                {formatPrice(row.close)}
                              </span>
                            </TableCell>
                            <TableCell className="space-x-2 flex items-center">
                              {sigBadge}
                              {row.isSignalFresh && (
                                <Badge variant="info">FRESH</Badge>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {row.volumeConfirmed ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {row.volumeConfirmed
                                    ? "Volume OK"
                                    : "Volume yếu"}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                {row.lastSignal === "BUY" ? (
                                  <Badge variant="success" className="gap-1">
                                    <ArrowUpRight className="h-3.5 w-3.5" /> BUY
                                  </Badge>
                                ) : row.lastSignal === "SELL" ? (
                                  <Badge
                                    variant="destructive"
                                    className="gap-1"
                                  >
                                    <ArrowDownRight className="h-3.5 w-3.5" />{" "}
                                    SELL
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <Minus className="h-3.5 w-3.5" /> NONE
                                  </Badge>
                                )}
                                {row.lastSignalPrice != null && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs text-muted-foreground">
                                        @ {formatPrice(row.lastSignalPrice)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <div>
                                          Entry:{" "}
                                          {formatPrice(row.lastSignalPrice)}
                                        </div>
                                        {row.entryLevels?.sl != null && (
                                          <div>
                                            SL:{" "}
                                            {formatPrice(row.entryLevels.sl)}
                                          </div>
                                        )}
                                        {row.entryLevels?.tp1 != null && (
                                          <div>
                                            TP1:{" "}
                                            {formatPrice(row.entryLevels.tp1)}
                                          </div>
                                        )}
                                        {row.entryLevels?.tp2 != null && (
                                          <div>
                                            TP2:{" "}
                                            {formatPrice(row.entryLevels.tp2)}
                                          </div>
                                        )}
                                        {row.entryLevels?.tp3 != null && (
                                          <div>
                                            TP3:{" "}
                                            {formatPrice(row.entryLevels.tp3)}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {row.barsSinceSignal ?? "-"} nến •
                                {row.signalAgeMinutes != null
                                  ? ` ${(row.signalAgeMinutes / 60).toFixed(
                                      1
                                    )}h`
                                  : " -"}
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-xs">
                                  {row.lastSignalOutcome &&
                                  row.lastSignalOutcome !== "NONE" ? (
                                    row.lastSignalOutcome === "SL" ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant="destructive"
                                            className="text-xs"
                                          >
                                            🎯 Hit SL
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="space-y-1">
                                            <div>Đã chạm Stop Loss</div>
                                            {row.lastSignalOutcomePrice && (
                                              <div>
                                                Tại giá:{" "}
                                                {formatPrice(
                                                  row.lastSignalOutcomePrice
                                                )}
                                              </div>
                                            )}
                                            {row.lastSignalOutcomeTime && (
                                              <div>
                                                Thời gian:{" "}
                                                {new Date(
                                                  row.lastSignalOutcomeTime
                                                ).toLocaleString("vi-VN")}
                                              </div>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant="success"
                                            className="text-xs"
                                          >
                                            🎯 Hit {row.lastSignalOutcome}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="space-y-1">
                                            <div>
                                              Đã chạm {row.lastSignalOutcome}
                                            </div>
                                            {row.lastSignalOutcomePrice && (
                                              <div>
                                                Tại giá:{" "}
                                                {formatPrice(
                                                  row.lastSignalOutcomePrice
                                                )}
                                              </div>
                                            )}
                                            {row.lastSignalOutcomeTime && (
                                              <div>
                                                Thời gian:{" "}
                                                {new Date(
                                                  row.lastSignalOutcomeTime
                                                ).toLocaleString("vi-VN")}
                                              </div>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    )
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          ⏳ Chưa chạm entry
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1">
                                          <div>
                                            Chưa chạm mức SL hoặc TP nào
                                          </div>
                                          <div>
                                            Giá hiện tại:{" "}
                                            {formatPrice(row.close)}
                                          </div>
                                          {row.lastSignalPrice && (
                                            <div>
                                              Entry:{" "}
                                              {formatPrice(row.lastSignalPrice)}
                                            </div>
                                          )}
                                          {row.entryLevels?.sl != null && (
                                            <div className="text-red-500">
                                              SL:{" "}
                                              {formatPrice(row.entryLevels.sl)}
                                            </div>
                                          )}
                                          {row.entryLevels?.tp1 != null && (
                                            <div className="text-green-500">
                                              TP1:{" "}
                                              {formatPrice(row.entryLevels.tp1)}
                                            </div>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                {/* Signal tracking từ mốc tín hiệu */}
                                {row.lastSignalTime && (
                                  <div className="text-xs space-y-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">
                                        Theo dõi:
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        📊{" "}
                                        {new Date(
                                          row.lastSignalTime
                                        ).toLocaleDateString("vi-VN")}{" "}
                                        {new Date(
                                          row.lastSignalTime
                                        ).toLocaleTimeString("vi-VN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </Badge>
                                    </div>
                                    {row.lastSignalPrice && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">
                                          Entry:
                                        </span>
                                        <span className="font-mono text-xs">
                                          {formatPrice(row.lastSignalPrice)}
                                        </span>
                                        <span className="text-muted-foreground">
                                          →
                                        </span>
                                        <span className="font-mono text-xs">
                                          {formatPrice(row.close)}
                                        </span>
                                        {(() => {
                                          const entry = row.lastSignalPrice;
                                          const current = row.close;
                                          let change = 0;

                                          if (row.lastSignal === "BUY") {
                                            change =
                                              ((current - entry) / entry) * 100;
                                          } else if (
                                            row.lastSignal === "SELL"
                                          ) {
                                            change =
                                              ((entry - current) / entry) * 100;
                                          }

                                          if (Math.abs(change) < 0.01)
                                            return null;

                                          return (
                                            <Badge
                                              variant={
                                                change >= 0
                                                  ? "success"
                                                  : "destructive"
                                              }
                                              className="text-xs ml-1"
                                            >
                                              {change >= 0 ? "+" : ""}
                                              {change.toFixed(2)}%
                                            </Badge>
                                          );
                                        })()}
                                      </div>
                                    )}
                                    {/* Progress bar đến TP/SL */}
                                    {row.lastSignalPrice && row.entryLevels && (
                                      <div className="flex items-center gap-1">
                                        {row.lastSignal === "BUY" &&
                                        row.entryLevels.tp1 &&
                                        row.entryLevels.sl
                                          ? (() => {
                                              const entry = row.lastSignalPrice;
                                              const current = row.close;
                                              const tp1 = row.entryLevels.tp1;
                                              const sl = row.entryLevels.sl;

                                              // Tính khoảng cách từ entry đến TP1 và SL
                                              const totalRange = tp1 - sl;
                                              const currentFromSL =
                                                current - sl;
                                              const progress = Math.max(
                                                0,
                                                Math.min(
                                                  100,
                                                  (currentFromSL / totalRange) *
                                                    100
                                                )
                                              );

                                              return (
                                                <div className="flex items-center gap-2 w-full">
                                                  <span className="text-red-400 text-xs">
                                                    SL
                                                  </span>
                                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-1.5 rounded-full transition-all duration-300"
                                                      style={{
                                                        width: `${progress}%`,
                                                      }}
                                                    />
                                                  </div>
                                                  <span className="text-green-400 text-xs">
                                                    TP1
                                                  </span>
                                                </div>
                                              );
                                            })()
                                          : row.lastSignal === "SELL" &&
                                            row.entryLevels.tp1 &&
                                            row.entryLevels.sl
                                          ? (() => {
                                              const entry = row.lastSignalPrice;
                                              const current = row.close;
                                              const tp1 = row.entryLevels.tp1;
                                              const sl = row.entryLevels.sl;

                                              // Với SELL, SL > entry > TP1
                                              const totalRange = sl - tp1;
                                              const currentFromTP1 =
                                                current - tp1;
                                              const progress = Math.max(
                                                0,
                                                Math.min(
                                                  100,
                                                  ((sl - current) /
                                                    totalRange) *
                                                    100
                                                )
                                              );

                                              return (
                                                <div className="flex items-center gap-2 w-full">
                                                  <span className="text-green-400 text-xs">
                                                    TP1
                                                  </span>
                                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                      className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1.5 rounded-full transition-all duration-300"
                                                      style={{
                                                        width: `${progress}%`,
                                                      }}
                                                    />
                                                  </div>
                                                  <span className="text-red-400 text-xs">
                                                    SL
                                                  </span>
                                                </div>
                                              );
                                            })()
                                          : null}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{row.mainTF}</TableCell>
                            <TableCell>
                              <Trend direction={trend} />
                            </TableCell>
                            <TableCell>{age}</TableCell>
                            <TableCell>{row.barsSinceSignal ?? "-"}</TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    {row.rsi2Sma7
                                      ? Number(row.rsi2Sma7).toFixed(1)
                                      : "-"}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{row.rsiStatus}</TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    {row.adx ? Number(row.adx).toFixed(1) : "-"}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{row.adxStatus}</TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <IndicatorDetails data={row} />
                              {(row.signal === "BUY" || row.signal === "SELL") && row.isSignalFresh && (
                                <>
                                  {row.barsSinceSignal === 0 ? (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => queueSignal(row)}
                                      title="Thêm vào queue, tự động track khi nến đóng"
                                    >
                                      ⏱️ Queue
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => trackSignal(row)}
                                    >
                                      Theo dõi
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRemove(s)}
                              >
                                Xóa
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </AuthWrapper>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive" | "info";
}) {
  const variant =
    tone === "success"
      ? "bg-green-600 text-white"
      : tone === "destructive"
      ? "bg-red-600 text-white"
      : tone === "info"
      ? "bg-blue-600 text-white"
      : "bg-muted";
  return (
    <div className={`rounded-lg border p-3 ${tone ? "" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 inline-flex h-7 min-w-12 items-center justify-center rounded-md px-2 text-sm font-semibold ${variant}`}
      >
        {value}
      </div>
    </div>
  );
}

function formatPrice(n?: number | null) {
  if (n == null) return "-";
  const v = Number(n);
  if (!isFinite(v)) return "-";
  return v >= 1000
    ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : v.toFixed(6);
}

function Trend({ direction }: { direction: string }) {
  const d = direction.toLowerCase();
  if (d.includes("tăng"))
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <TrendingUp className="h-4 w-4" /> Tăng
      </span>
    );
  if (d.includes("giảm"))
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <TrendingDown className="h-4 w-4" /> Giảm
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" /> Trung lập
    </span>
  );
}

function baseFromSymbol(symbol: string) {
  const m = symbol.match(
    /^(.*?)(USDT|FDUSD|BUSD|USDC|TUSD|EUR|TRY|BRL|BIDR|NGN|DAI|USD|SUSD)$/
  );
  return (m ? m[1] : symbol) || symbol;
}

function logoUrl(symbol: string) {
  const base = baseFromSymbol(symbol).toUpperCase();
  return `https://bin.bnbstatic.com/static/assets/logos/${base}.png`;
}
