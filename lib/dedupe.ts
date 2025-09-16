import { query } from './db'

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS sent_signals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(64) NOT NULL,
  tf VARCHAR(16) NOT NULL,
  \`signal\` VARCHAR(16) NOT NULL,
  signal_time DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_sig (symbol, tf, \`signal\`, signal_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`

export async function ensureSchema() {
  await query(CREATE_SQL)
}

export async function markIfNew({ symbol, tf, signal, signalTimeISO }: { symbol: string; tf: string; signal: string; signalTimeISO: string }) {
  const dt = new Date(signalTimeISO)
  // Convert to MySQL DATETIME string (UTC)
  const yyyy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  const hh = String(dt.getUTCHours()).padStart(2, '0')
  const mi = String(dt.getUTCMinutes()).padStart(2, '0')
  const ss = String(dt.getUTCSeconds()).padStart(2, '0')
  const mysqlDatetime = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`

  try {
    await query(
      'INSERT INTO sent_signals (\`symbol\`, \`tf\`, \`signal\`, \`signal_time\`) VALUES (?, ?, ?, ?)',
      [symbol, tf, signal, mysqlDatetime],
    )
    return true // inserted (new)
  } catch (e: any) {
    // Duplicate unique key -> already sent
    if (e && e.code === 'ER_DUP_ENTRY') return false
    throw e
  }
}

export async function unmark({ symbol, tf, signal, signalTimeISO }: { symbol: string; tf: string; signal: string; signalTimeISO: string }) {
  const dt = new Date(signalTimeISO)
  const yyyy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  const hh = String(dt.getUTCHours()).padStart(2, '0')
  const mi = String(dt.getUTCMinutes()).padStart(2, '0')
  const ss = String(dt.getUTCSeconds()).padStart(2, '0')
  const mysqlDatetime = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
  await query(
    'DELETE FROM sent_signals WHERE \`symbol\`=? AND \`tf\`=? AND \`signal\`=? AND \`signal_time\`=? LIMIT 1',
    [symbol, tf, signal, mysqlDatetime],
  )
}
