import { NextRequest } from "next/server"
import { getIndicator } from "@/lib/indicator"
import { DEFAULT_SYMBOLS, BLOCKED_SYMBOLS } from "@/lib/symbols"
import { ensureSchema, markIfNew, unmark } from "@/lib/dedupe"

export const dynamic = "force-dynamic"

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
  const tpLines = [
    e.tp1 != null ? `🟩 TP1: <code>${fmt(e.tp1)}</code> (${pctDiff(r.close, e.tp1) ?? '-'})` : null,
    e.tp2 != null ? `🟩 TP2: <code>${fmt(e.tp2)}</code> (${pctDiff(r.close, e.tp2) ?? '-'})` : null,
    e.tp3 != null ? `🟩 TP3: <code>${fmt(e.tp3)}</code> (${pctDiff(r.close, e.tp3) ?? '-'})` : null,
    (e as any).tp4 != null ? `🟩 TP4: <code>${fmt((e as any).tp4)}</code> (${pctDiff(r.close, (e as any).tp4) ?? '-'})` : null,
    (e as any).tp5 != null ? `🟩 TP5: <code>${fmt((e as any).tp5)}</code> (${pctDiff(r.close, (e as any).tp5) ?? '-'})` : null,
    (e as any).tp6 != null ? `🟩 TP6: <code>${fmt((e as any).tp6)}</code> (${pctDiff(r.close, (e as any).tp6) ?? '-'})` : null,
  ].filter(Boolean)
  const lines = [
    `<b>${sigEmoji} ${r.signal} ${r.symbol.toUpperCase()} (${r.mainTF})</b> ${trendEmoji}`,
    `Giá: <b>${fmt(r.close)}</b>` + (age ? `  •  ${age}` : ''),
    `⚪ Entry: <code>${fmt(e.entry)}</code> (${pctDiff(r.close, e.entry) ?? '-'})`,
    ...tpLines,
  `🟥 SL: <code>${fmt(e.sl)}</code> (${pctDiff(r.close, e.sl) ?? '-'})`,
    r.lastSignal && r.lastSignalPrice != null ? `Last: <b>${r.lastSignal}</b> @ <code>${fmt(r.lastSignalPrice)}</code>` : undefined,
  ].filter(Boolean)
  return { text: lines.join('\n'), parse_mode: 'HTML' as const, photo: logoUrl(r.symbol) }
}

async function sendTelegram({ text, photo, chatId, token }: { text: string; photo?: string; chatId: string; token: string }) {
  const base = `https://api.telegram.org/bot${token}`
  if (photo) {
    const res = await fetch(`${base}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo, caption: text, parse_mode: 'HTML' })
    })
    if (!res.ok) throw new Error(`Telegram sendPhoto ${res.status}`)
    return
  }
  const res = await fetch(`${base}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  })
  if (!res.ok) throw new Error(`Telegram sendMessage ${res.status}`)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tf = (searchParams.get("tf") || "15m").trim()
  const only = (searchParams.get("only") || "new").toLowerCase() as "new" | "fresh" | "any"
  const limit = Number(searchParams.get("limit") || 500)
  const includeBlocked = searchParams.get("includeBlocked") === "1"
  const symbolsStr = searchParams.get("symbols")
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = searchParams.get("chat_id") || process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!token || !chatId) {
    return Response.json({ error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID' }, { status: 400 })
  }

  const all = (symbolsStr ? symbolsStr.split(",") : DEFAULT_SYMBOLS)
    .map(s=>s.toString().trim().toUpperCase()).filter(Boolean)
  const symbols = includeBlocked ? all : all.filter(s => !BLOCKED_SYMBOLS.includes(s))

  try {
    await ensureSchema()
    const results: any[] = []
    for (const symbol of symbols) {
      try {
        const r = await getIndicator({ symbol, intervals: [tf], limit })
        // filter
        const match = ((): boolean => {
          if (only === 'any') return true
          if (only === 'fresh') return r.signal !== 'NONE' && !!r.isSignalFresh
          // new
          return (r.newSignal ?? 'NONE') !== 'NONE'
        })()
        if (!match) continue

        const sigTime = r.lastSignalTime || r.time
        const sigType = r.newSignal && r.newSignal !== 'NONE' ? r.newSignal : r.signal
        if (!sigTime || !sigType || sigType === 'NONE') continue

        // dedupe
        const ok = await markIfNew({ symbol: r.symbol, tf, signal: sigType, signalTimeISO: sigTime })
        if (!ok) continue

        const t = formatTelegramHTML(r)
        const hitLine = (r as any).lastSignalOutcome && (r as any).lastSignalOutcome !== 'NONE'
          ? `\n🎯 Hit: <b>${(r as any).lastSignalOutcome}</b> @ <code>${fmt((r as any).lastSignalOutcomePrice)}</code>`
          : `\n🎯 Hit: <b>chưa chạm</b>`
        try {
          await sendTelegram({ text: t.text + hitLine, photo: t.photo, chatId, token })
          results.push({ symbol: r.symbol, signal: r.signal, newSignal: r.newSignal, time: r.time })
        } catch (e) {
          // rollback dedupe mark if send fails
          await unmark({ symbol: r.symbol, tf, signal: sigType, signalTimeISO: sigTime })
          throw e
        }
      } catch (e: any) {
        // Continue scanning next symbol
      }
    }

    return Response.json({ meta: { tf, limit, only, total: symbols.length, sent: results.length, now: new Date().toISOString() }, results }, { status: 200 })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
