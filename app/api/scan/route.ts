import { NextRequest } from "next/server"
import { getIndicator } from "@/lib/indicator"
import { DEFAULT_SYMBOLS, BLOCKED_SYMBOLS } from "@/lib/symbols"
import { ensureSchema, markIfNew } from "@/lib/dedupe"

export const dynamic = "force-dynamic"

// Basic blocklist reused for safety
const BLOCKED = new Set(BLOCKED_SYMBOLS)

function baseFromSymbol(symbol: string) {
  const m = symbol.match(/^(.*?)(USDT|FDUSD|BUSD|USDC|TUSD|EUR|TRY|BRL|BIDR|NGN|DAI|USD|SUSD)$/)
  return (m ? m[1] : symbol) || symbol
}

function logoUrl(symbol: string) {
  const base = baseFromSymbol(symbol).toUpperCase()
  return `https://bin.bnbstatic.com/static/assets/logos/${base}.png`
}

function fmt(n?: number | null, d = 6) {
  if (n == null || !isFinite(Number(n))) return "-"
  const v = Number(n)
  return v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v.toFixed(d)
}

function pctDiff(from: number, to?: number | null) {
  if (to == null || from === 0) return null
  const p = ((to - from) / from) * 100
  return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`
}

function formatTelegramHTML(r: any) {
  const sigEmoji = r.signal === 'BUY' ? '🟢' : r.signal === 'SELL' ? '🔴' : '⚪'
  const trend = String(r.priceDirection || '')
  const trendEmoji = /tăng/i.test(trend) ? '⬆️' : /giảm/i.test(trend) ? '⬇️' : '↔️'
  const age = r.barsSinceSignal != null && r.signalAgeMinutes != null
    ? `🕒 ${r.barsSinceSignal} nến • ${(r.signalAgeMinutes/60).toFixed(1)}h` : ''
  const e = r.entryLevels || {}
  const tpLine = [
    e.tp1 != null ? `TP1 <code>${fmt(e.tp1)}</code> (${pctDiff(r.close, e.tp1) ?? '-'})` : null,
    e.tp2 != null ? `TP2 <code>${fmt(e.tp2)}</code> (${pctDiff(r.close, e.tp2) ?? '-'})` : null,
    e.tp3 != null ? `TP3 <code>${fmt(e.tp3)}</code> (${pctDiff(r.close, e.tp3) ?? '-'})` : null,
  ].filter(Boolean).join(' • ')
  const lines = [
    `<b>${sigEmoji} ${r.signal} ${r.symbol.toUpperCase()} (${r.mainTF})</b> ${trendEmoji}`,
    `Giá: <b>${fmt(r.close)}</b>` + (age ? `  •  ${age}` : ''),
    `⚪ Entry: <code>${fmt(e.entry)}</code> (${pctDiff(r.close, e.entry) ?? '-'})`,
    `🟥 SL: <code>${fmt(e.sl)}</code> (${pctDiff(r.close, e.sl) ?? '-'})`,
    tpLine ? `🟩 ${tpLine}` : undefined,
    r.lastSignalOutcome && r.lastSignalOutcome !== 'NONE' ? `🎯 Hit: <b>${r.lastSignalOutcome}</b> @ <code>${fmt(r.lastSignalOutcomePrice)}</code>` : `🎯 Hit: <b>chưa chạm</b>`,
    `RSI2: <b>${r.rsi2Sma7 != null ? Number(r.rsi2Sma7).toFixed(1) : '-'}</b>  •  ADX14: <b>${r.adx != null ? Number(r.adx).toFixed(1) : '-'}</b>`,
    r.lastSignal && r.lastSignalPrice != null ? `Last: <b>${r.lastSignal}</b> @ <code>${fmt(r.lastSignalPrice)}</code>` : undefined,
  ].filter(Boolean)
  return { parse_mode: 'HTML' as const, text: lines.join('\n'), photo: logoUrl(r.symbol) }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbolsStr = searchParams.get("symbols")
  const symbolsParam = (symbolsStr ? symbolsStr.split(",") : DEFAULT_SYMBOLS)
    .map(s=>s.toString().trim().toUpperCase())
    .filter(Boolean)
  const tf = (searchParams.get("tf") || "4h").trim()
  const limit = Number(searchParams.get("limit") || 500)
  const only = (searchParams.get("only") || "new").toLowerCase() as "new" | "fresh" | "any"
  const includeBlocked = searchParams.get("includeBlocked") === "1"
  const dedupe = searchParams.get("dedupe") === "1"

  const symbols = includeBlocked ? symbolsParam : symbolsParam.filter(s => !BLOCKED.has(s))

  try {
    const results = await Promise.all(symbols.map(async (symbol) => {
      try {
        const d = await getIndicator({ symbol, intervals: [tf], limit })
        return d
      } catch (e: any) {
        return { symbol, error: e?.message || "error" }
      }
    }))

    let filtered = results.filter((r: any) => {
      if ((r as any).error) return false
      if (only === "any") return true
      if (only === "fresh") return r.signal !== "NONE" && !!r.isSignalFresh
      // default: new
      return r.newSignal && r.newSignal !== "NONE"
    })

    if (dedupe) {
      await ensureSchema()
      const out: any[] = []
      for (const r of filtered as any[]) {
        // Prefer lastSignalTime for a stable signal timestamp
        const sigTime = r.lastSignalTime || r.time
        const sigType = r.newSignal && r.newSignal !== 'NONE' ? r.newSignal : r.signal
        if (!sigTime || !sigType || sigType === 'NONE') continue
        const ok = await markIfNew({ symbol: r.symbol, tf, signal: sigType, signalTimeISO: sigTime })
        if (ok) out.push(r)
      }
      filtered = out
    }

    const body: any = {
      meta: {
        tf,
        limit,
        only,
        now: new Date().toISOString(),
        total: symbols.length,
        matched: filtered.length,
      },
      results: filtered.map((r: any) => ({
        symbol: r.symbol,
        mainTF: r.mainTF,
        time: r.time,
        close: r.close,
        signal: r.signal,
        newSignal: r.newSignal,
        isSignalFresh: r.isSignalFresh,
        lastSignal: r.lastSignal,
        lastSignalTime: r.lastSignalTime,
        lastSignalPrice: r.lastSignalPrice,
        barsSinceSignal: r.barsSinceSignal,
        signalAgeMinutes: r.signalAgeMinutes,
        entryLevels: r.entryLevels,
        rsi2Sma7: r.rsi2Sma7,
        adx: r.adx,
        priceDirection: r.priceDirection,
      }))
    }

    // Optional: include preformatted Telegram text
    const fmt = (req.nextUrl.searchParams.get('format') || '').toLowerCase()
    if (fmt === 'telegram') {
      body.results = filtered.map((r: any) => ({
        ...r,
        telegram: formatTelegramHTML(r)
      }))
    }

    return Response.json(body, { status: 200 })
  } catch (e: any) {
    return Response.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
