"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle } from "lucide-react"

type IndicatorResponse = Awaited<ReturnType<typeof import("@/lib/indicator").getIndicator>>

export function IndicatorDetails({ data }: { data: IndicatorResponse }) {
  const entry = data.entryLevels?.entry?.toFixed(6)
  const sl = data.entryLevels?.sl?.toFixed(6)
  const tp1 = data.entryLevels?.tp1?.toFixed(6)
  const tp2 = data.entryLevels?.tp2?.toFixed(6)
  const tp3 = data.entryLevels?.tp3?.toFixed(6)
  const sigBadge = data.signal === 'BUY'
    ? <Badge variant="success" className="gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> BUY</Badge>
    : data.signal === 'SELL'
    ? <Badge variant="destructive" className="gap-1"><ArrowDownRight className="h-3.5 w-3.5" /> SELL</Badge>
    : <Badge variant="secondary" className="gap-1"><Minus className="h-3.5 w-3.5" /> NONE</Badge>

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Chi tiet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><span className="uppercase tracking-wide">{data.symbol}</span> • {sigBadge}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="text-xs text-muted-foreground">
            Signal gan nhat: {data.lastSignal} {data.lastSignalPrice != null ? `@ ${fmt(data.lastSignalPrice)}` : ''}
            {data.lastSignalTime ? ` • ${new Date(data.lastSignalTime).toLocaleString()}` : ''}
            {` • ${data.barsSinceSignal ?? '-'} nen • ${toHours(data.signalAgeMinutes)}`}
          </div>
          <div className="flex items-center gap-2">
            <Trend direction={String(data.priceDirection || '')} />
            {data.volumeConfirmed ? <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" /> Volume OK</span> : <span className="inline-flex items-center gap-1 text-muted-foreground"><XCircle className="h-4 w-4" /> Volume yeu</span>}
          </div>
          <PriceLevelsList
            current={data.close}
            entry={data.entryLevels?.entry ?? null}
            sl={data.entryLevels?.sl ?? null}
            tp1={data.entryLevels?.tp1 ?? null}
            tp2={data.entryLevels?.tp2 ?? null}
            tp3={data.entryLevels?.tp3 ?? null}
            pos={data.entryLevels?.pos ?? 0}
          />
          <div className="grid grid-cols-2 gap-2">
            <Info label="Gia hien tai" value={fmt(data.close)} />
            <Info label="Khung" value={data.mainTF} />
            <Info label="RSI(2) SMA7" value={data.rsi2Sma7 ? Number(data.rsi2Sma7).toFixed(1) : '-'} sub={data.rsiStatus} />
            <Info label="ADX(14)" value={data.adx ? Number(data.adx).toFixed(1) : '-'} sub={data.adxStatus} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Info label="Entry" value={entry} />
            <Info label="SL" value={sl} />
            <Info label="TP1" value={tp1} />
            <Info label="TP2" value={tp2} />
            <Info label="TP3" value={tp3} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(data.srLevels || {}).map(([tf, lev]) => (
              <Info key={tf} label={`SR ${tf}`} value={`H:${fmt(lev.recentHigh)} / L:${fmt(lev.recentLow)}`} />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Cap nhat: {new Date(data.time).toLocaleString()} • Tuoi tin hieu: {toHours(data.signalAgeMinutes)} • Cach nen: {data.barsSinceSignal ?? '-'} • Fresh: {data.isSignalFresh ? 'YES' : 'NO'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, value, sub }: { label: string; value?: string | number | null; sub?: string }) {
  return (
    <div className="p-1">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? '-'}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function fmt(n?: number | null) {
  if (n == null) return '-'
  const v = Number(n)
  if (!isFinite(v)) return '-'
  return v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v.toFixed(6)
}

function toHours(min?: number | null) {
  if (min == null) return '-'
  return `${(min/60).toFixed(1)}h`
}

function Trend({ direction }: { direction: string }) {
  const d = direction.toLowerCase()
  if (d.includes('tang')) return (
    <span className="inline-flex items-center gap-1 text-green-600"><TrendingUp className="h-4 w-4" /> Tang</span>
  )
  if (d.includes('giam')) return (
    <span className="inline-flex items-center gap-1 text-red-600"><TrendingDown className="h-4 w-4" /> Giam</span>
  )
  return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="h-4 w-4" /> Trung lap</span>
}

function PriceLevelsList({ current, entry, sl, tp1, tp2, tp3, pos } : { current: number, entry: number | null, sl: number | null, tp1: number | null, tp2: number | null, tp3: number | null, pos: number }) {
  const Row = ({ label, color, value }: { label: string; color: string; value: number | null }) => {
    if (value == null) return null;
    const diff = value - current;
    const pct = current !== 0 ? (diff / current) * 100 : 0;
    return (
      <div className="flex items-center justify-between rounded-md border px-2 py-1">
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-sm font-medium">
          {fmt(value)} <span className="text-xs text-muted-foreground">({diff >= 0 ? "+" : ""}{diff.toFixed(6)} | {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)</span>
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
      <div className="text-xs text-muted-foreground">Hướng: {pos === 1 ? 'Long' : pos === -1 ? 'Short' : 'N/A'}</div>
    </div>
  );
}
