"use client";
import { useEffect, useMemo, useState } from "react";
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
  "DAIUSDT",
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
  const ALT_NONE = "none";
  const intervals = useMemo(
    () => [mainTF, altTF].filter(Boolean),
    [mainTF, altTF]
  );
  const visibleSymbols = useMemo(
    () => symbols.filter((s) => !BLOCKED_SYMBOLS.includes(s)),
    [symbols]
  );

  // Sắp xếp symbols với priority: có signal trước, fresh signal trước, sau đó theo alphabet
  const sortedVisibleSymbols = useMemo(() => {
    const symbolsWithData = visibleSymbols.map((symbol) => {
      const row = data[symbol] as any;
      return {
        symbol,
        hasSignal: row && !row.error && row.signal && row.signal !== "NONE",
        isFresh: row && !row.error && row.isSignalFresh,
        signal: row && !row.error ? row.signal : "NONE",
        lastSignal: row && !row.error ? row.lastSignal : "NONE",
      };
    });

    return symbolsWithData
      .sort((a, b) => {
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
  }, [visibleSymbols, data]);

  const fetchOne = async (symbol: string) => {
    const res = await fetch(
      `/api/indicator?symbol=${symbol}&intervals=${intervals.join(",")}`
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<IndicatorResponse>;
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
  }, [symbols.join(","), auto, intervals.join(",")]);

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
                  {["15m", "30m", "1h", "4h", "1d"].map((tf) => (
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
                  {[ALT_NONE, "15m", "1h", "4h", "1d"].map((tf) => (
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
                        ? (summary.winSignals / summary.lossSignals).toFixed(2)
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
            <CardTitle className="text-base">Danh sách cặp</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="font-semibold">Giá</TableHead>
                  <TableHead>Tín hiệu</TableHead>
                  <TableHead>Last</TableHead>
                  <TableHead>TF</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Tuổi (giờ)</TableHead>
                  <TableHead>Cách nến</TableHead>
                  <TableHead>RSI</TableHead>
                  <TableHead>ADX</TableHead>
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
                            <TableCell colSpan={9} className="text-destructive">
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
                                <Badge variant="destructive" className="gap-1">
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
                                          SL: {formatPrice(row.entryLevels.sl)}
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
                                ? ` ${(row.signalAgeMinutes / 60).toFixed(1)}h`
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
                                        <div>Chưa chạm mức SL hoặc TP nào</div>
                                        <div>
                                          Giá hiện tại: {formatPrice(row.close)}
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
                                        } else if (row.lastSignal === "SELL") {
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
                                            const currentFromSL = current - sl;
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
                                                ((sl - current) / totalRange) *
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
