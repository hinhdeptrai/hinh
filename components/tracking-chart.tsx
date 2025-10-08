"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TradingViewChart } from "@/components/tradingview-chart";
import { TradingViewReplay } from "@/components/tradingview-replay";
import { ArrowUpRight, ArrowDownRight, Play, Eye } from "lucide-react";

type SignalRecord = {
  id: number;
  symbol: string;
  timeframe: string;
  signal_type: "BUY" | "SELL";
  entry_price: number;
  sl_price: number;
  tp1_price: number;
  tp2_price: number;
  tp3_price: number;
  tp4_price: number;
  tp5_price: number;
  tp6_price: number;
  outcome: "TP1" | "TP2" | "TP3" | "TP4" | "TP5" | "TP6" | "SL" | "NONE";
  outcome_price?: number;
  entry_time: string;
  exit_time?: string;
  bars_duration?: number;
  is_fresh: boolean;
  volume_confirmed: boolean;
};

export function TrackingChart({
  signal,
  onClose,
}: {
  signal: SignalRecord;
  onClose: () => void;
}) {
  const [priceData, setPriceData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentPrice, setCurrentPrice] = React.useState<number | null>(null);
  const [mode, setMode] = React.useState<"live" | "replay">("live");

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch 100 klines
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${signal.symbol}&interval=${signal.timeframe}&limit=100`
        );

        if (!res.ok) throw new Error("Failed to fetch klines");

        const klines = await res.json();

        // Tìm index của nến entry (dựa vào entry_time)
        const entryTime = new Date(signal.entry_time).getTime();

        // Get tolerance based on timeframe
        const getToleranceMs = (tf: string) => {
          const map: Record<string, number> = {
            "1m": 60000,
            "3m": 180000,
            "5m": 300000,
            "15m": 900000,
            "30m": 1800000,
            "1h": 3600000,
            "2h": 7200000,
            "4h": 14400000,
          };
          return map[tf] || 3600000;
        };

        const tolerance = getToleranceMs(signal.timeframe);

        // Tìm nến gần nhất với entry_time
        let closestIndex = -1;
        let minDiff = Infinity;

        klines.forEach((k: any[], idx: number) => {
          const candleTime = k[0];
          const diff = Math.abs(candleTime - entryTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = idx;
          }
        });

        // Chỉ coi là match nếu trong tolerance
        const entryIndex = minDiff <= tolerance ? closestIndex : -1;

        // Format data
        const formatted = klines.map((k: any[], idx: number) => ({
          time: new Date(k[0]).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          }),
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          isEntryCandle: entryIndex >= 0 && idx === entryIndex,
        }));

        // Lấy giá hiện tại (nến cuối)
        const lastCandle = formatted[formatted.length - 1];
        setCurrentPrice(lastCandle.close);

        console.log("Tracking chart data:", {
          total: formatted.length,
          entryIndex,
          entryTime: new Date(entryTime).toISOString(),
          closestCandleTime: entryIndex >= 0 ? new Date(klines[closestIndex][0]).toISOString() : null,
          timeDiffMs: minDiff,
          timeDiffMinutes: (minDiff / 60000).toFixed(2),
          tolerance: (tolerance / 60000).toFixed(2) + " minutes",
          matched: entryIndex >= 0,
          currentPrice: lastCandle.close,
          outcome: signal.outcome,
        });

        setPriceData(formatted);
      } catch (e) {
        console.error("Failed to fetch tracking data:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30_000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [signal]);

  // Tính toán P&L
  const calculatePnL = () => {
    if (!currentPrice) return null;
    const entry = Number(signal.entry_price);
    let pnl = 0;

    if (signal.signal_type === "BUY") {
      pnl = ((currentPrice - entry) / entry) * 100;
    } else {
      pnl = ((entry - currentPrice) / entry) * 100;
    }

    return pnl;
  };

  const pnl = calculatePnL();
  const isPending = signal.outcome === "NONE";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="uppercase tracking-wide">{signal.symbol}</span>
              {signal.signal_type === "BUY" ? (
                <Badge variant="success" className="gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5" /> BUY
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <ArrowDownRight className="h-3.5 w-3.5" /> SELL
                </Badge>
              )}
              {signal.outcome !== "NONE" && (
                <Badge
                  variant={signal.outcome === "SL" ? "destructive" : "success"}
                >
                  {signal.outcome}
                </Badge>
              )}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant={mode === "live" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("live")}
              >
                <Eye className="h-4 w-4 mr-1" />
                Live
              </Button>
              <Button
                variant={mode === "replay" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("replay")}
              >
                <Play className="h-4 w-4 mr-1" />
                Replay
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Entry</div>
              <div className="text-lg font-bold">
                {Number(signal.entry_price).toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(signal.entry_time).toLocaleString("vi-VN")}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Hiện tại</div>
              <div className="text-lg font-bold">
                {currentPrice ? currentPrice.toFixed(6) : "-"}
              </div>
              {pnl !== null && (
                <div
                  className={`text-sm font-semibold ${
                    pnl >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(2)}%
                </div>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">SL</div>
              <div className="text-lg font-bold text-red-600">
                {Number(signal.sl_price).toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">
                {(
                  ((Number(signal.sl_price) - Number(signal.entry_price)) /
                    Number(signal.entry_price)) *
                  100
                ).toFixed(2)}
                %
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">TP1</div>
              <div className="text-lg font-bold text-green-600">
                {Number(signal.tp1_price).toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">
                {(
                  ((Number(signal.tp1_price) - Number(signal.entry_price)) /
                    Number(signal.entry_price)) *
                  100
                ).toFixed(2)}
                %
              </div>
            </div>
          </div>

          {/* Chart */}
          {loading ? (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              Đang tải biểu đồ...
            </div>
          ) : priceData.length === 0 ? (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              Không có dữ liệu giá
            </div>
          ) : mode === "live" ? (
            <TradingViewChart
              data={priceData.map((d) => ({
                time: d.timestamp,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
              }))}
              entryPrice={Number(signal.entry_price)}
              slPrice={Number(signal.sl_price)}
              tp1Price={Number(signal.tp1_price)}
              tp2Price={Number(signal.tp2_price)}
              tp3Price={Number(signal.tp3_price)}
              entryIndex={priceData.findIndex((d) => d.isEntryCandle)}
              symbol={signal.symbol}
              timeframe={signal.timeframe}
            />
          ) : (
            <TradingViewReplay
              data={priceData.map((d) => ({
                time: d.timestamp,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
              }))}
              entryPrice={Number(signal.entry_price)}
              slPrice={Number(signal.sl_price)}
              tp1Price={Number(signal.tp1_price)}
              tp2Price={Number(signal.tp2_price)}
              tp3Price={Number(signal.tp3_price)}
              entryIndex={priceData.findIndex((d) => d.isEntryCandle)}
              symbol={signal.symbol}
              timeframe={signal.timeframe}
            />
          )}

          {/* TP Levels Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {[
              { label: "TP1", price: signal.tp1_price },
              { label: "TP2", price: signal.tp2_price },
              { label: "TP3", price: signal.tp3_price },
              { label: "TP4", price: signal.tp4_price },
              { label: "TP5", price: signal.tp5_price },
              { label: "TP6", price: signal.tp6_price },
            ].map((tp) => (
              <div key={tp.label} className="rounded border p-2">
                <div className="text-xs text-muted-foreground">{tp.label}</div>
                <div className="font-mono font-semibold">
                  {Number(tp.price).toFixed(6)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(
                    ((Number(tp.price) - Number(signal.entry_price)) /
                      Number(signal.entry_price)) *
                    100
                  ).toFixed(2)}
                  %
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
