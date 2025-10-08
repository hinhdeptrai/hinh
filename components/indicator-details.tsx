"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { TradingViewChart } from "./tradingview-chart";

type IndicatorResponse = Awaited<
  ReturnType<typeof import("@/lib/indicator").getIndicator>
>;

export function IndicatorDetails({ data }: { data: IndicatorResponse }) {
  const entry = data.entryLevels?.entry?.toFixed(6);
  const sl = data.entryLevels?.sl?.toFixed(6);
  const tp1 = data.entryLevels?.tp1?.toFixed(6);
  const tp2 = data.entryLevels?.tp2?.toFixed(6);
  const tp3 = data.entryLevels?.tp3?.toFixed(6);
  const tp4 =
    (data.entryLevels as any)?.tp4 != null
      ? Number((data.entryLevels as any).tp4).toFixed(6)
      : undefined;
  const tp5 =
    (data.entryLevels as any)?.tp5 != null
      ? Number((data.entryLevels as any).tp5).toFixed(6)
      : undefined;
  const tp6 =
    (data.entryLevels as any)?.tp6 != null
      ? Number((data.entryLevels as any).tp6).toFixed(6)
      : undefined;
  const sigBadge =
    data.signal === "BUY" ? (
      <Badge variant="success" className="gap-1">
        <ArrowUpRight className="h-3.5 w-3.5" /> BUY
      </Badge>
    ) : data.signal === "SELL" ? (
      <Badge variant="destructive" className="gap-1">
        <ArrowDownRight className="h-3.5 w-3.5" /> SELL
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <Minus className="h-3.5 w-3.5" /> NONE
      </Badge>
    );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Chi tiet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="uppercase tracking-wide">{data.symbol}</span> •{" "}
            {sigBadge}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <div className="text-xs text-muted-foreground">
            Signal gan nhat: {data.lastSignal}{" "}
            {data.lastSignalPrice != null
              ? `@ ${fmt(data.lastSignalPrice)}`
              : ""}
            {data.lastSignalTime
              ? ` • ${new Date(data.lastSignalTime).toLocaleString()}`
              : ""}
            {` • ${data.barsSinceSignal ?? "-"} nen • ${toHours(
              data.signalAgeMinutes
            )}`}
          </div>
          <div className="flex items-center gap-2">
            <Trend direction={String(data.priceDirection || "")} />
            {data.volumeConfirmed ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Volume OK
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <XCircle className="h-4 w-4" /> Volume yeu
              </span>
            )}
          </div>

          {/* Price Movement Chart */}
          <PriceMovementChart data={data} />

          {/* Win Rate Chart Section */}
          <SignalPerformanceChart data={data} />

          <PriceLevelsList
            current={data.close}
            entry={data.entryLevels?.entry ?? null}
            sl={data.entryLevels?.sl ?? null}
            tp1={data.entryLevels?.tp1 ?? null}
            tp2={data.entryLevels?.tp2 ?? null}
            tp3={data.entryLevels?.tp3 ?? null}
            tp4={(data.entryLevels as any)?.tp4 ?? null}
            tp5={(data.entryLevels as any)?.tp5 ?? null}
            tp6={(data.entryLevels as any)?.tp6 ?? null}
            pos={data.entryLevels?.pos ?? 0}
          />
          <div className="grid grid-cols-2 gap-2">
            <Info label="Gia hien tai" value={fmt(data.close)} />
            <Info label="Khung" value={data.mainTF} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Info label="Entry" value={entry} />
            <Info label="SL" value={sl} />
            <Info label="TP1" value={tp1} />
            <Info label="TP2" value={tp2} />
            <Info label="TP3" value={tp3} />
            {tp4 && <Info label="TP4" value={tp4} />}
            {tp5 && <Info label="TP5" value={tp5} />}
            {tp6 && <Info label="TP6" value={tp6} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(data.srLevels || {}).map(([tf, lev]) => (
              <Info
                key={tf}
                label={`SR ${tf}`}
                value={`H:${fmt(lev.recentHigh)} / L:${fmt(lev.recentLow)}`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Cap nhat: {new Date(data.time).toLocaleString()} • Tuoi tin hieu:{" "}
            {toHours(data.signalAgeMinutes)} • Cach nen:{" "}
            {data.barsSinceSignal ?? "-"} • Fresh:{" "}
            {data.isSignalFresh ? "YES" : "NO"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({
  label,
  value,
  sub,
}: {
  label: string;
  value?: string | number | null;
  sub?: string;
}) {
  return (
    <div className="p-1">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? "-"}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function fmt(n?: number | null) {
  if (n == null) return "-";
  const v = Number(n);
  if (!isFinite(v)) return "-";
  return v >= 1000
    ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : v.toFixed(6);
}

function toHours(min?: number | null) {
  if (min == null) return "-";
  return `${(min / 60).toFixed(1)}h`;
}

function Trend({ direction }: { direction: string }) {
  const d = direction.toLowerCase();
  if (d.includes("tang"))
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <TrendingUp className="h-4 w-4" /> Tang
      </span>
    );
  if (d.includes("giam"))
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <TrendingDown className="h-4 w-4" /> Giam
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" /> Trung lap
    </span>
  );
}

function PriceMovementChart({ data }: { data: IndicatorResponse }) {
  const [priceData, setPriceData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchPriceData() {
      try {
        // Fetch 500 nến
        const limit = 500;

        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${data.symbol}&interval=${data.mainTF}&limit=${limit}`
        );

        if (!res.ok) {
          throw new Error(`Binance API error: ${res.status}`);
        }

        const klines = await res.json();

        // Tìm index của nến signal (nếu có)
        let signalCandleIndex = -1;
        if (
          data.lastSignalTime &&
          data.barsSinceSignal != null &&
          data.barsSinceSignal >= 0
        ) {
          // Nến signal = nến cuối - barsSinceSignal
          signalCandleIndex = klines.length - 1 - data.barsSinceSignal;
        }

        // Format: [timestamp, open, high, low, close, volume, ...]
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
          isSignalCandle: idx === signalCandleIndex, // Đánh dấu nến signal
        }));

        console.log("Chart data:", {
          total: formatted.length,
          signalCandleIndex,
          barsSinceSignal: data.barsSinceSignal,
          firstCandle: formatted[0]?.time,
          lastCandle: formatted[formatted.length - 1]?.time,
          signalCandle:
            signalCandleIndex >= 0 ? formatted[signalCandleIndex]?.time : "N/A",
        });

        setPriceData(formatted);
      } catch (e: any) {
        console.error("Failed to fetch price data:", e.message, e);
      } finally {
        setLoading(false);
      }
    }
    fetchPriceData();
  }, [data.symbol, data.mainTF, data.barsSinceSignal]);

  const hasSignal = data.lastSignal && data.lastSignal !== "NONE";
  const entryPrice = data.entryLevels?.entry;
  const slPrice = data.entryLevels?.sl;
  const tp1Price = data.entryLevels?.tp1;
  const tp2Price = data.entryLevels?.tp2;
  const tp3Price = data.entryLevels?.tp3;

  if (loading) {
    return (
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="text-sm text-muted-foreground text-center">
          📈 Đang tải biểu đồ giá...
        </div>
      </div>
    );
  }

  if (priceData.length === 0) {
    return (
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="text-sm text-muted-foreground text-center">
          📈 Không có dữ liệu giá
        </div>
      </div>
    );
  }

  return (
    <TradingViewChart
      data={priceData.map((d) => ({
        time: d.timestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))}
      entryPrice={entryPrice || undefined}
      slPrice={slPrice || undefined}
      tp1Price={tp1Price || undefined}
      tp2Price={tp2Price || undefined}
      tp3Price={tp3Price || undefined}
      entryIndex={priceData.findIndex((d) => d.isSignalCandle)}
      symbol={data.symbol}
      timeframe={data.mainTF}
    />
  );
}

function PriceMovementChartOld({ data }: { data: IndicatorResponse }) {
  const [priceData, setPriceData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchPriceData() {
      try {
        // Fetch 500 nến
        const limit = 500;

        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${data.symbol}&interval=${data.mainTF}&limit=${limit}`
        );

        if (!res.ok) {
          throw new Error(`Binance API error: ${res.status}`);
        }

        const klines = await res.json();

        // Tìm index của nến signal (nếu có)
        let signalCandleIndex = -1;
        if (
          data.lastSignalTime &&
          data.barsSinceSignal != null &&
          data.barsSinceSignal >= 0
        ) {
          // Nến signal = nến cuối - barsSinceSignal
          signalCandleIndex = klines.length - 1 - data.barsSinceSignal;
        }

        // Format: [timestamp, open, high, low, close, volume, ...]
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
          isSignalCandle: idx === signalCandleIndex, // Đánh dấu nến signal
        }));

        console.log("Chart data:", {
          total: formatted.length,
          signalCandleIndex,
          barsSinceSignal: data.barsSinceSignal,
          firstCandle: formatted[0]?.time,
          lastCandle: formatted[formatted.length - 1]?.time,
          signalCandle:
            signalCandleIndex >= 0 ? formatted[signalCandleIndex]?.time : "N/A",
        });

        setPriceData(formatted);
      } catch (e: any) {
        console.error("Failed to fetch price data:", e.message, e);
      } finally {
        setLoading(false);
      }
    }
    fetchPriceData();
  }, [data.symbol, data.mainTF, data.barsSinceSignal]);

  const hasSignal = data.lastSignal && data.lastSignal !== "NONE";
  const entryPrice = data.entryLevels?.entry;
  const slPrice = data.entryLevels?.sl;
  const tp1Price = data.entryLevels?.tp1;
  const tp2Price = data.entryLevels?.tp2;
  const tp3Price = data.entryLevels?.tp3;

  if (loading) {
    return (
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="text-sm text-muted-foreground text-center">
          📈 Đang tải biểu đồ giá...
        </div>
      </div>
    );
  }

  if (priceData.length === 0) {
    return (
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="text-sm text-muted-foreground text-center">
          📈 Không có dữ liệu giá
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 bg-gradient-to-br from-slate-50/50 to-gray-50/50 dark:from-slate-950/20 dark:to-gray-950/20">
      <div className="text-sm font-semibold mb-3 flex items-center justify-between">
        <span>📈 Biểu đồ giá từ tín hiệu</span>
        <span className="text-xs text-muted-foreground">
          {data.barsSinceSignal} nến • {data.mainTF}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={priceData}
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9 }}
            angle={-45}
            textAnchor="end"
            height={70}
            interval={Math.floor(priceData.length / 10) || 1}
          />
          <YAxis
            domain={["dataMin - 1%", "dataMax + 1%"]}
            tick={{ fontSize: 11 }}
            tickFormatter={(val) =>
              val >= 1000 ? val.toFixed(0) : val.toFixed(4)
            }
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      padding: "10px",
                      fontSize: "11px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        marginBottom: "4px",
                        color: d.isSignalCandle ? "#f59e0b" : "#000",
                      }}
                    >
                      {d.time} {d.isSignalCandle ? "🔔 SIGNAL" : ""}
                    </div>
                    <div style={{ color: "#16a34a" }}>
                      O: {d.open?.toFixed(6)}
                    </div>
                    <div style={{ color: "#2563eb" }}>
                      H: {d.high?.toFixed(6)}
                    </div>
                    <div style={{ color: "#ef4444" }}>
                      L: {d.low?.toFixed(6)}
                    </div>
                    <div style={{ fontWeight: "bold" }}>
                      C: {d.close?.toFixed(6)}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Reference lines for levels */}
          {entryPrice && (
            <ReferenceLine
              y={entryPrice}
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: "Entry",
                position: "right",
                fontSize: 11,
                fill: "#6b7280",
                fontWeight: "bold",
              }}
            />
          )}
          {slPrice && (
            <ReferenceLine
              y={slPrice}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: "SL",
                position: "right",
                fontSize: 11,
                fill: "#ef4444",
                fontWeight: "bold",
              }}
            />
          )}
          {tp1Price && (
            <ReferenceLine
              y={tp1Price}
              stroke="#16a34a"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={{
                value: "TP1",
                position: "right",
                fontSize: 10,
                fill: "#16a34a",
              }}
            />
          )}
          {tp2Price && (
            <ReferenceLine
              y={tp2Price}
              stroke="#16a34a"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{
                value: "TP2",
                position: "right",
                fontSize: 10,
                fill: "#16a34a",
              }}
            />
          )}
          {tp3Price && (
            <ReferenceLine
              y={tp3Price}
              stroke="#16a34a"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{
                value: "TP3",
                position: "right",
                fontSize: 10,
                fill: "#16a34a",
              }}
            />
          )}

          {/* High line */}
          <Line
            type="monotone"
            dataKey="high"
            stroke="#93c5fd"
            strokeWidth={1}
            dot={false}
            connectNulls
          />

          {/* Low line */}
          <Line
            type="monotone"
            dataKey="low"
            stroke="#fca5a5"
            strokeWidth={1}
            dot={false}
            connectNulls
          />

          {/* Close line (main) */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={(props: any) => {
              if (props.payload?.isSignalCandle) {
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={8}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }
              return <circle cx={props.cx} cy={props.cy} r={0} />;
            }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white" />
          <span className="font-medium">🔔 Nến signal</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-0.5 bg-gray-500"
            style={{ borderTop: "2px dashed" }}
          />
          <span>Entry</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-0.5 bg-red-500"
            style={{ borderTop: "2px dashed" }}
          />
          <span>SL</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-0.5 bg-green-500"
            style={{ borderTop: "2px dashed" }}
          />
          <span>TP1-3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-blue-600" style={{ height: "3px" }} />
          <span>Close</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-blue-300" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-red-300" />
          <span>Low</span>
        </div>
        <div className="text-muted-foreground text-xs">
          Total: {priceData.length} nến
        </div>
      </div>
    </div>
  );
}

function SignalPerformanceChart({ data }: { data: IndicatorResponse }) {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(
          `/api/signal-history?symbol=${data.symbol}&timeframe=${data.mainTF}&stats=true`
        );
        if (res.ok) {
          const result = await res.json();
          setStats(result);
        }
      } catch (e) {
        console.error("Failed to fetch signal stats:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [data.symbol, data.mainTF]);

  // Tính toán win rate từ lastSignalOutcome
  const hasSignal = data.lastSignal && data.lastSignal !== "NONE";
  const outcome = data.lastSignalOutcome || "NONE";

  // If we have stats from DB, use them; otherwise fallback to current signal
  const isWin = outcome !== "NONE" && outcome !== "SL";
  const isLoss = outcome === "SL";
  const isPending = hasSignal && outcome === "NONE";

  const winCount = stats ? Number(stats.wins || 0) : isWin ? 1 : 0;
  const lossCount = stats ? Number(stats.losses || 0) : isLoss ? 1 : 0;
  const pendingCount = stats ? Number(stats.pending || 0) : isPending ? 1 : 0;
  const total = winCount + lossCount + pendingCount;

  const chartData = [
    { name: "WIN", value: winCount, color: "#16a34a" },
    { name: "LOSS", value: lossCount, color: "#ef4444" },
    { name: "PENDING", value: pendingCount, color: "#eab308" },
  ].filter((item) => item.value > 0);

  const winRate =
    winCount + lossCount > 0 ? (winCount / (winCount + lossCount)) * 100 : 0;

  if (loading) {
    return (
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="text-sm text-muted-foreground text-center">
          📊 Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  if (!hasSignal && total === 0) {
    return (
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="text-sm text-muted-foreground text-center">
          📊 Chưa có signal để hiển thị performance
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
      <div className="text-sm font-semibold mb-3 flex items-center gap-2">
        📊 Signal Performance
        {outcome !== "NONE" && (
          <Badge
            variant={isWin ? "success" : "destructive"}
            className="text-xs"
          >
            {outcome}
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Chart */}
        <div className="flex items-center justify-center">
          {total > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: any, name: any) => [value, name]}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted-foreground">
              Không có dữ liệu
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-600 dark:text-green-400">
                WIN
              </div>
              <div className="text-xl font-bold text-green-700 dark:text-green-300">
                {winCount}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 border border-red-200 dark:border-red-800">
              <div className="text-xs text-red-600 dark:text-red-400">LOSS</div>
              <div className="text-xl font-bold text-red-700 dark:text-red-300">
                {lossCount}
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
              Win Rate
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {winRate.toFixed(1)}%
            </div>
            {outcome !== "NONE" && (
              <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                Hit: {outcome}
              </div>
            )}
          </div>

          {pendingCount > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                ⏳ {pendingCount} signal đang chờ kết quả
              </div>
            </div>
          )}
        </div>
      </div>

      {stats && total > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-muted-foreground">TP1</div>
            <div className="font-semibold text-green-600">
              {stats.tp1_count || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">TP2</div>
            <div className="font-semibold text-green-600">
              {stats.tp2_count || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">TP3</div>
            <div className="font-semibold text-green-600">
              {stats.tp3_count || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">TP4</div>
            <div className="font-semibold text-green-600">
              {stats.tp4_count || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">TP5</div>
            <div className="font-semibold text-green-600">
              {stats.tp5_count || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">TP6</div>
            <div className="font-semibold text-green-600">
              {stats.tp6_count || 0}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        💡{" "}
        {stats
          ? `Tổng ${total} signal đã tracking từ database`
          : "Hiển thị outcome của signal gần nhất"}
      </div>
    </div>
  );
}

function PriceLevelsList({
  current,
  entry,
  sl,
  tp1,
  tp2,
  tp3,
  tp4,
  tp5,
  tp6,
  pos,
}: {
  current: number;
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  tp4?: number | null;
  tp5?: number | null;
  tp6?: number | null;
  pos: number;
}) {
  const Row = ({
    label,
    color,
    value,
  }: {
    label: string;
    color: string;
    value: number | null;
  }) => {
    if (value == null) return null;
    const diff = value - current;
    const pct = current !== 0 ? (diff / current) * 100 : 0;
    return (
      <div className="flex items-center justify-between rounded-md border px-2 py-1">
        <div className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: color }}
          />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-sm font-medium">
          {fmt(value)}{" "}
          <span className="text-xs text-muted-foreground">
            ({diff >= 0 ? "+" : ""}
            {diff.toFixed(6)} | {pct >= 0 ? "+" : ""}
            {pct.toFixed(2)}%)
          </span>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase text-muted-foreground">Mức giá</div>
      <Row label="Giá hiện tại" color="#2563eb" value={current} />
      <Row label="Entry" color="#6b7280" value={entry} />
      <Row label="SL" color="#ef4444" value={sl} />
      <Row label="TP1" color="#16a34a" value={tp1} />
      <Row label="TP2" color="#16a34a" value={tp2} />
      <Row label="TP3" color="#16a34a" value={tp3} />
      {tp4 != null && <Row label="TP4" color="#16a34a" value={tp4} />}
      {tp5 != null && <Row label="TP5" color="#16a34a" value={tp5} />}
      {tp6 != null && <Row label="TP6" color="#16a34a" value={tp6} />}
      <div className="text-xs text-muted-foreground">
        Hướng: {pos === 1 ? "Long" : pos === -1 ? "Short" : "N/A"}
      </div>
    </div>
  );
}
