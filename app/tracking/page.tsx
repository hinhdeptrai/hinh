"use client";
import { useEffect, useState } from "react";
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
import { TrackingChart } from "@/components/tracking-chart";
import { ArrowUpRight, ArrowDownRight, Trash2, TrendingUp, TrendingDown } from "lucide-react";

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
  status?: "ACTIVE" | "MATCHED" | "NOT_FOUND";
  binance_candle_time?: string;
  created_at: string;
};

export default function TrackingPage() {
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<SignalRecord | null>(null);

  const loadSignals = async () => {
    setLoading(true);
    try {
      // Get all tracked signals (query without symbol to get all)
      console.log("Loading signals from /api/signal-history...");
      const res = await fetch("/api/signal-history?limit=100");
      console.log("Signal history response:", res.status, res.ok);

      if (res.ok) {
        const data = await res.json();
        console.log("Loaded signals:", data.length, data);
        setSignals(data);
      } else {
        const error = await res.json();
        console.error("Failed to load signals:", error);
      }
    } catch (e) {
      console.error("Failed to load signals exception:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignals();
    const interval = setInterval(loadSignals, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const deleteSignal = async (id: number) => {
    if (!confirm("Xóa signal này?")) return;
    // TODO: implement delete endpoint
    alert("Chức năng xóa đang được phát triển");
  };

  const verifySignals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/verify-signals", { method: "POST" });
      const result = await res.json();
      console.log("Verification result:", result);

      if (result.success) {
        alert(
          `Đã xác minh ${result.totalSignals} signals:\n` +
          `✅ Matched: ${result.summary.matched}\n` +
          `❌ Not Found: ${result.summary.notFound}\n` +
          `⚠️ Errors: ${result.summary.errors}`
        );
        await loadSignals(); // Reload to see updated status
      } else {
        alert("Lỗi khi xác minh signals");
      }
    } catch (e) {
      console.error("Failed to verify signals:", e);
      alert("Lỗi khi xác minh signals");
    } finally {
      setLoading(false);
    }
  };

  const groupedBySymbol = signals.reduce((acc, signal) => {
    if (!acc[signal.symbol]) acc[signal.symbol] = [];
    acc[signal.symbol].push(signal);
    return acc;
  }, {} as Record<string, SignalRecord[]>);

  const stats = {
    total: signals.length,
    pending: signals.filter((s) => s.outcome === "NONE").length,
    win: signals.filter((s) => s.outcome !== "NONE" && s.outcome !== "SL").length,
    loss: signals.filter((s) => s.outcome === "SL").length,
  };

  const winRate = stats.win + stats.loss > 0 ? (stats.win / (stats.win + stats.loss)) * 100 : 0;

  return (
    <AuthWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Theo dõi Signals</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý các signal đang theo dõi từ database
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={verifySignals} disabled={loading} variant="outline">
              {loading ? "Đang xác minh..." : "Xác minh với Binance"}
            </Button>
            <Button onClick={loadSignals} disabled={loading}>
              {loading ? "Đang tải..." : "Làm mới"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Tổng</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Win</div>
              <div className="text-2xl font-bold text-green-600">{stats.win}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Loss</div>
              <div className="text-2xl font-bold text-red-600">{stats.loss}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold text-purple-600">{winRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Signals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Signals ({signals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : signals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có signal nào được theo dõi
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>TF</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>SL / TP1</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((signal) => {
                    const isPending = signal.outcome === "NONE";
                    const isWin = signal.outcome !== "NONE" && signal.outcome !== "SL";
                    const isLoss = signal.outcome === "SL";

                    return (
                      <TableRow key={signal.id}>
                        <TableCell className="font-mono font-semibold">
                          {signal.symbol}
                        </TableCell>
                        <TableCell>{signal.timeframe}</TableCell>
                        <TableCell>
                          {signal.signal_type === "BUY" ? (
                            <Badge variant="success" className="gap-1">
                              <ArrowUpRight className="h-3.5 w-3.5" /> BUY
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <ArrowDownRight className="h-3.5 w-3.5" /> SELL
                            </Badge>
                          )}
                          {signal.is_fresh && (
                            <Badge variant="info" className="ml-1">FRESH</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {Number(signal.entry_price).toFixed(6)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="text-red-600">
                            SL: {Number(signal.sl_price).toFixed(6)}
                          </div>
                          <div className="text-green-600">
                            TP1: {Number(signal.tp1_price).toFixed(6)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <Badge variant="secondary">⏳ Pending</Badge>
                          ) : isWin ? (
                            <Badge variant="success">✅ {signal.outcome}</Badge>
                          ) : (
                            <Badge variant="destructive">❌ SL</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {signal.status === "MATCHED" ? (
                            <Badge variant="success" className="gap-1">
                              ✓ Matched
                            </Badge>
                          ) : signal.status === "NOT_FOUND" ? (
                            <Badge variant="destructive" className="gap-1">
                              ✗ Not Found
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              ⚡ Active
                            </Badge>
                          )}
                          {signal.binance_candle_time && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(signal.binance_candle_time).toLocaleString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{new Date(signal.entry_time).toLocaleString("vi-VN")}</div>
                          {signal.exit_time && (
                            <div className="text-xs">
                              → {new Date(signal.exit_time).toLocaleString("vi-VN")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSignal(signal)}
                          >
                            Xem chart
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSignal(signal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Chart Modal/Panel */}
        {selectedSignal && (
          <TrackingChart
            signal={selectedSignal}
            onClose={() => setSelectedSignal(null)}
          />
        )}
      </div>
    </AuthWrapper>
  );
}
