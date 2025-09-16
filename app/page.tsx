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
        visibleSymbols.map(async (s) => {
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
    return { total: visibleSymbols.length, buy, sell, fresh };
  }, [data, visibleSymbols.length]);

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
                  {["15m", "1h", "4h", "1d"].map((tf) => (
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
          <Stat label="Tổng" value={summary.total} />
          <Stat label="BUY" value={summary.buy} tone="success" />
          <Stat label="SELL" value={summary.sell} tone="destructive" />
          <Stat label="FRESH" value={summary.fresh} tone="info" />
        </div>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Danh sách cặp</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Giá</TableHead>
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
                {visibleSymbols.map((s) => {
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
                          <span className="uppercase tracking-wide">{row.symbol}</span>
                        </span>
                      </TableCell>
                      <TableCell>{formatPrice(row.close)}</TableCell>
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
                            {row.volumeConfirmed ? "Volume OK" : "Volume yếu"}
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
                              <ArrowDownRight className="h-3.5 w-3.5" /> SELL
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Minus className="h-3.5 w-3.5" /> NONE
                            </Badge>
                          )}
                          {row.lastSignalPrice != null && (
                            <span className="text-xs text-muted-foreground">
                              @ {formatPrice(row.lastSignalPrice)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.barsSinceSignal ?? "-"} nến •
                          {row.signalAgeMinutes != null
                            ? ` ${(row.signalAgeMinutes / 60).toFixed(1)}h`
                            : " -"}
                        </div>
                        <div className="text-xs">
                          {row.lastSignalOutcome && row.lastSignalOutcome !== 'NONE' ? (
                            row.lastSignalOutcome === 'SL' ? (
                              <Badge variant="destructive">Hit: SL</Badge>
                            ) : (
                              <Badge variant="success">Hit: {row.lastSignalOutcome}</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">Hit: chưa chạm</Badge>
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
  const m = symbol.match(/^(.*?)(USDT|FDUSD|BUSD|USDC|TUSD|EUR|TRY|BRL|BIDR|NGN|DAI|USD|SUSD)$/)
  return (m ? m[1] : symbol) || symbol
}

function logoUrl(symbol: string) {
  const base = baseFromSymbol(symbol).toUpperCase()
  return `https://bin.bnbstatic.com/static/assets/logos/${base}.png`
}
