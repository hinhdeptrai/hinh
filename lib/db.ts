import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getPool() {
  if (pool) return pool
  const {
    MYSQL_HOST = 'localhost',
    MYSQL_PORT = '3306',
    MYSQL_USER = 'root',
    MYSQL_PASSWORD = '',
    MYSQL_DATABASE = 'trade_admin',
    MYSQL_URI,
  } = process.env as Record<string, string | undefined>

  if (MYSQL_URI) {
    pool = mysql.createPool({ uri: MYSQL_URI, connectionLimit: 4 })
  } else {
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: Number(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      connectionLimit: 4,
    })
  }
  return pool
}

export async function query<T = any>(sql: string, params: any[] = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows as T
}

// Auto-create auth tables
const CREATE_AUTH_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS auth_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  is_used BOOLEAN DEFAULT FALSE,
  INDEX idx_code (code),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  user_ip VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_token (session_token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function ensureAuthSchema() {
  const statements = CREATE_AUTH_TABLES_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await query(statement);
  }
}

// Auth codes functions
export async function storeAuthCode(code: string, expiresAt: Date) {
  await ensureAuthSchema();
  const sql = 'INSERT INTO auth_codes (code, expires_at) VALUES (?, ?)';
  return await query(sql, [code, expiresAt]);
}

export async function verifyAuthCode(code: string) {
  await ensureAuthSchema();
  const sql = `
    SELECT id, code, expires_at, is_used 
    FROM auth_codes 
    WHERE code = ? AND expires_at > NOW() AND is_used = FALSE 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  const rows = await query<any[]>(sql, [code]);
  
  if (rows.length === 0) {
    return null;
  }
  
  const authCode = rows[0];
  
  // Mark as used
  const updateSql = 'UPDATE auth_codes SET is_used = TRUE, used_at = NOW() WHERE id = ?';
  await query(updateSql, [authCode.id]);
  
  return authCode;
}

export async function cleanupExpiredCodes() {
  await ensureAuthSchema();
  const sql = 'DELETE FROM auth_codes WHERE expires_at < NOW() OR is_used = TRUE';
  return await query(sql);
}

// User sessions functions
export async function storeUserSession(sessionToken: string, expiresAt: Date, userIp?: string, userAgent?: string) {
  await ensureAuthSchema();
  console.log('Storing user session:', {
    tokenLength: sessionToken.length,
    expiresAt: expiresAt.toISOString(),
    userIp,
    userAgentLength: userAgent?.length
  });
  const sql = 'INSERT INTO user_sessions (session_token, expires_at, user_ip, user_agent) VALUES (?, ?, ?, ?)';
  const result = await query(sql, [sessionToken, expiresAt, userIp, userAgent]);
  console.log('Session stored successfully:', result);
  return result;
}

export async function verifyUserSession(sessionToken: string) {
  await ensureAuthSchema();
  console.log('Verifying user session:', {
    tokenLength: sessionToken.length,
    tokenPrefix: sessionToken.substring(0, 10) + '...'
  });
  const sql = `
    SELECT id, session_token, expires_at, is_active 
    FROM user_sessions 
    WHERE session_token = ? AND expires_at > NOW() AND is_active = TRUE 
    LIMIT 1
  `;
  const rows = await query<any[]>(sql, [sessionToken]);
  console.log('Session verification result:', {
    foundSessions: rows.length,
    session: rows.length > 0 ? {
      id: rows[0].id,
      expiresAt: rows[0].expires_at,
      isActive: rows[0].is_active
    } : null
  });
  return rows.length > 0 ? rows[0] : null;
}

export async function invalidateUserSession(sessionToken: string) {
  await ensureAuthSchema();
  const sql = 'UPDATE user_sessions SET is_active = FALSE WHERE session_token = ?';
  return await query(sql, [sessionToken]);
}

// Signal history tracking
const CREATE_SIGNAL_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS signal_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  signal_type ENUM('BUY', 'SELL') NOT NULL,
  indicator_type ENUM('FIBONACCI_ALGO', 'RSI_MACD_EMA', 'MACD_BB', 'RSI_VOLUME_BB', 'SUPERTREND_EMA', 'EMA_CROSS_RSI') DEFAULT 'FIBONACCI_ALGO',
  entry_price DECIMAL(20, 8) NOT NULL,
  sl_price DECIMAL(20, 8),
  tp1_price DECIMAL(20, 8),
  tp2_price DECIMAL(20, 8),
  tp3_price DECIMAL(20, 8),
  tp4_price DECIMAL(20, 8),
  tp5_price DECIMAL(20, 8),
  tp6_price DECIMAL(20, 8),
  outcome ENUM('TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'SL', 'NONE') DEFAULT 'NONE',
  outcome_price DECIMAL(20, 8),
  entry_time BIGINT NOT NULL COMMENT 'Unix timestamp in milliseconds',
  exit_time BIGINT NULL COMMENT 'Unix timestamp in milliseconds',
  bars_duration INT,
  is_fresh BOOLEAN DEFAULT FALSE,
  volume_confirmed BOOLEAN DEFAULT FALSE,
  status ENUM('ACTIVE', 'MATCHED', 'NOT_FOUND') DEFAULT 'ACTIVE',
  binance_candle_time BIGINT NULL COMMENT 'Unix timestamp in milliseconds',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_symbol (symbol),
  INDEX idx_timeframe (timeframe),
  INDEX idx_entry_time (entry_time),
  INDEX idx_outcome (outcome),
  INDEX idx_symbol_tf (symbol, timeframe),
  INDEX idx_indicator_type (indicator_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function ensureSignalHistorySchema() {
  try {
    await query(CREATE_SIGNAL_HISTORY_TABLE);
    console.log('Signal history table ensured');

    // Add indicator_type column if it doesn't exist
    try {
      await query(`
        ALTER TABLE signal_history
        ADD COLUMN IF NOT EXISTS indicator_type ENUM('FIBONACCI_ALGO', 'RSI_MACD_EMA', 'MACD_BB', 'RSI_VOLUME_BB', 'SUPERTREND_EMA', 'EMA_CROSS_RSI') DEFAULT 'FIBONACCI_ALGO'
        AFTER signal_type
      `);
    } catch (e: any) {
      // Column might already exist, ignore error
      if (!e.message?.includes('Duplicate column')) {
        console.error('Failed to add indicator_type column:', e.message);
      }
    }
  } catch (e: any) {
    // Table might already exist, ignore error
    if (!e.message?.includes('already exists')) {
      console.error('Failed to create signal history table:', e.message);
    }
  }
}


export type SignalHistoryRecord = {
  id?: number;
  symbol: string;
  timeframe: string;
  signal_type: 'BUY' | 'SELL';
  indicator_type?: 'FIBONACCI_ALGO' | 'RSI_MACD_EMA' | 'MACD_BB' | 'RSI_VOLUME_BB' | 'SUPERTREND_EMA' | 'EMA_CROSS_RSI';
  entry_price: number;
  sl_price?: number;
  tp1_price?: number;
  tp2_price?: number;
  tp3_price?: number;
  tp4_price?: number;
  tp5_price?: number;
  tp6_price?: number;
  outcome?: 'TP1' | 'TP2' | 'TP3' | 'TP4' | 'TP5' | 'TP6' | 'SL' | 'NONE';
  outcome_price?: number;
  entry_time: Date | string;
  exit_time?: Date | string | null;
  bars_duration?: number;
  is_fresh?: boolean;
  volume_confirmed?: boolean;
  status?: 'ACTIVE' | 'MATCHED' | 'NOT_FOUND';
  binance_candle_time?: Date | string | null;
};

export async function storeSignal(record: SignalHistoryRecord) {
  // Convert date to Unix timestamp in milliseconds
  const toTimestamp = (date: Date | string | undefined | null): number | null => {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getTime(); // Returns milliseconds since Unix epoch
  };

  const sql = `
    INSERT INTO signal_history (
      symbol, timeframe, signal_type, indicator_type, entry_price,
      sl_price, tp1_price, tp2_price, tp3_price, tp4_price, tp5_price, tp6_price,
      outcome, outcome_price, entry_time, exit_time, bars_duration,
      is_fresh, volume_confirmed, binance_candle_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [
    record.symbol,
    record.timeframe,
    record.signal_type,
    record.indicator_type || 'FIBONACCI_ALGO',
    record.entry_price,
    record.sl_price || null,
    record.tp1_price || null,
    record.tp2_price || null,
    record.tp3_price || null,
    record.tp4_price || null,
    record.tp5_price || null,
    record.tp6_price || null,
    record.outcome || 'NONE',
    record.outcome_price || null,
    toTimestamp(record.entry_time),
    toTimestamp(record.exit_time),
    record.bars_duration || null,
    record.is_fresh || false,
    record.volume_confirmed || false,
    toTimestamp(record.binance_candle_time),
  ]);
}

export async function updateSignalOutcome(
  symbol: string,
  timeframe: string,
  entryTime: Date | string | number,
  outcome: 'TP1' | 'TP2' | 'TP3' | 'TP4' | 'TP5' | 'TP6' | 'SL',
  outcomePrice: number,
  exitTime: Date | string | number,
  barsDuration?: number
) {
  // Convert to Unix timestamp in milliseconds
  const toTimestamp = (date: Date | string | number): number => {
    if (typeof date === 'number') return date;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getTime();
  };

  const entryTimeMs = toTimestamp(entryTime);
  const exitTimeMs = toTimestamp(exitTime);

  const sql = `
    UPDATE signal_history
    SET outcome = ?,
        outcome_price = ?,
        exit_time = ?,
        bars_duration = ?
    WHERE symbol = ?
      AND timeframe = ?
      AND entry_time = ?
      AND outcome = 'NONE'
    LIMIT 1
  `;
  return await query(sql, [
    outcome,
    outcomePrice,
    exitTimeMs,
    barsDuration || null,
    symbol,
    timeframe,
    entryTimeMs,
  ]);
}

export async function getSignalHistory(
  symbol: string,
  timeframe?: string,
  limit: number = 50
) {
  let sql = `SELECT * FROM signal_history WHERE symbol = '${symbol}'`;

  if (timeframe) {
    sql += ` AND timeframe = '${timeframe}'`;
  }

  sql += ` ORDER BY entry_time DESC LIMIT ${limit}`;

  return await query<SignalHistoryRecord[]>(sql, []);
}

export async function getSignalStats(symbol: string, timeframe?: string) {
  let sql = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN outcome IN ('TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6') THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN outcome = 'SL' THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN outcome = 'NONE' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN outcome = 'TP1' THEN 1 ELSE 0 END) as tp1_count,
      SUM(CASE WHEN outcome = 'TP2' THEN 1 ELSE 0 END) as tp2_count,
      SUM(CASE WHEN outcome = 'TP3' THEN 1 ELSE 0 END) as tp3_count,
      SUM(CASE WHEN outcome = 'TP4' THEN 1 ELSE 0 END) as tp4_count,
      SUM(CASE WHEN outcome = 'TP5' THEN 1 ELSE 0 END) as tp5_count,
      SUM(CASE WHEN outcome = 'TP6' THEN 1 ELSE 0 END) as tp6_count
    FROM signal_history
    WHERE symbol = '${symbol}'
  `;

  if (timeframe) {
    sql += ` AND timeframe = '${timeframe}'`;
  }

  const rows = await query<any[]>(sql, []);
  return rows[0] || { total: 0, wins: 0, losses: 0, pending: 0 };
}


// Indicator settings table
const CREATE_INDICATOR_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS symbol_indicator_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  indicator_type ENUM(
    'FIBONACCI_ALGO',
    'RSI_MACD_EMA',
    'MACD_BB',
    'RSI_VOLUME_BB',
    'SUPERTREND_EMA',
    'EMA_CROSS_RSI'
  ) NOT NULL DEFAULT 'FIBONACCI_ALGO',
  settings JSON NULL COMMENT 'Custom settings for indicator in JSON format',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_symbol_tf (symbol, timeframe),
  INDEX idx_symbol (symbol),
  INDEX idx_timeframe (timeframe),
  INDEX idx_indicator_type (indicator_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function ensureIndicatorSettingsSchema() {
  try {
    await query(CREATE_INDICATOR_SETTINGS_TABLE);
    console.log('Indicator settings table ensured');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) {
      console.error('Failed to create indicator settings table:', e.message);
    }
  }
}

export type IndicatorSettingsRecord = {
  id?: number;
  symbol: string;
  timeframe: string;
  indicator_type: 'FIBONACCI_ALGO' | 'RSI_MACD_EMA' | 'MACD_BB' | 'RSI_VOLUME_BB' | 'SUPERTREND_EMA' | 'EMA_CROSS_RSI';
  settings?: any;
};

export async function getIndicatorSettings(symbol: string, timeframe: string) {
  await ensureIndicatorSettingsSchema();
  const sql = `SELECT * FROM symbol_indicator_settings WHERE symbol = ? AND timeframe = ? LIMIT 1`;
  const rows = await query<IndicatorSettingsRecord[]>(sql, [symbol, timeframe]);
  return rows[0] || null;
}

export async function saveIndicatorSettings(record: IndicatorSettingsRecord) {
  await ensureIndicatorSettingsSchema();
  const sql = `
    INSERT INTO symbol_indicator_settings (symbol, timeframe, indicator_type, settings)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      indicator_type = VALUES(indicator_type),
      settings = VALUES(settings),
      updated_at = CURRENT_TIMESTAMP
  `;
  return await query(sql, [
    record.symbol,
    record.timeframe,
    record.indicator_type,
    record.settings ? JSON.stringify(record.settings) : null,
  ]);
}

export async function deleteIndicatorSettings(symbol: string, timeframe: string) {
  await ensureIndicatorSettingsSchema();
  const sql = `DELETE FROM symbol_indicator_settings WHERE symbol = ? AND timeframe = ?`;
  return await query(sql, [symbol, timeframe]);
}

// Signal Queue for unconfirmed signals
const CREATE_SIGNAL_QUEUE_TABLE = `
CREATE TABLE IF NOT EXISTS signal_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  signal_type ENUM('BUY', 'SELL') NOT NULL,
  indicator_type ENUM('FIBONACCI_ALGO', 'RSI_MACD_EMA', 'MACD_BB', 'RSI_VOLUME_BB', 'SUPERTREND_EMA', 'EMA_CROSS_RSI') DEFAULT 'FIBONACCI_ALGO',
  entry_price DECIMAL(20, 8) NOT NULL,
  sl_price DECIMAL(20, 8),
  tp1_price DECIMAL(20, 8),
  tp2_price DECIMAL(20, 8),
  tp3_price DECIMAL(20, 8),
  tp4_price DECIMAL(20, 8),
  tp5_price DECIMAL(20, 8),
  tp6_price DECIMAL(20, 8),
  signal_time BIGINT NOT NULL COMMENT 'Unix timestamp in milliseconds when signal appeared',
  candle_close_time BIGINT NOT NULL COMMENT 'Unix timestamp in milliseconds when candle closes',
  is_fresh BOOLEAN DEFAULT FALSE,
  volume_confirmed BOOLEAN DEFAULT FALSE,
  status ENUM('PENDING', 'PROCESSED', 'FAILED') DEFAULT 'PENDING',
  processed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_candle_close (candle_close_time),
  INDEX idx_status_closetime (status, candle_close_time),
  INDEX idx_symbol_tf (symbol, timeframe),
  INDEX idx_indicator_type (indicator_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function ensureSignalQueueSchema() {
  try {
    await query(CREATE_SIGNAL_QUEUE_TABLE);
    console.log('Signal queue table ensured');

    // Add indicator_type column if it doesn't exist
    try {
      await query(`
        ALTER TABLE signal_queue
        ADD COLUMN IF NOT EXISTS indicator_type ENUM('FIBONACCI_ALGO', 'RSI_MACD_EMA', 'MACD_BB', 'RSI_VOLUME_BB', 'SUPERTREND_EMA', 'EMA_CROSS_RSI') DEFAULT 'FIBONACCI_ALGO'
        AFTER signal_type
      `);
    } catch (e: any) {
      // Column might already exist, ignore error
      if (!e.message?.includes('Duplicate column')) {
        console.error('Failed to add indicator_type column to signal_queue:', e.message);
      }
    }
  } catch (e: any) {
    if (!e.message?.includes('already exists')) {
      console.error('Failed to create signal queue table:', e.message);
    }
  }
}

export type SignalQueueRecord = {
  id?: number;
  symbol: string;
  timeframe: string;
  signal_type: 'BUY' | 'SELL';
  indicator_type?: 'FIBONACCI_ALGO' | 'RSI_MACD_EMA' | 'MACD_BB' | 'RSI_VOLUME_BB' | 'SUPERTREND_EMA' | 'EMA_CROSS_RSI';
  entry_price: number;
  sl_price?: number;
  tp1_price?: number;
  tp2_price?: number;
  tp3_price?: number;
  tp4_price?: number;
  tp5_price?: number;
  tp6_price?: number;
  signal_time: Date | string | number;
  candle_close_time: Date | string | number;
  is_fresh?: boolean;
  volume_confirmed?: boolean;
  status?: 'PENDING' | 'PROCESSED' | 'FAILED';
};

export async function addSignalToQueue(record: SignalQueueRecord) {
  await ensureSignalQueueSchema();
  
  const toTimestamp = (date: Date | string | number): number => {
    if (typeof date === 'number') return date;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getTime();
  };

  const sql = `
    INSERT INTO signal_queue (
      symbol, timeframe, signal_type, indicator_type, entry_price,
      sl_price, tp1_price, tp2_price, tp3_price, tp4_price, tp5_price, tp6_price,
      signal_time, candle_close_time, is_fresh, volume_confirmed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return await query(sql, [
    record.symbol,
    record.timeframe,
    record.signal_type,
    record.indicator_type || 'FIBONACCI_ALGO',
    record.entry_price,
    record.sl_price || null,
    record.tp1_price || null,
    record.tp2_price || null,
    record.tp3_price || null,
    record.tp4_price || null,
    record.tp5_price || null,
    record.tp6_price || null,
    toTimestamp(record.signal_time),
    toTimestamp(record.candle_close_time),
    record.is_fresh || false,
    record.volume_confirmed || false,
  ]);
}

export async function getPendingQueueSignals(limit: number = 100) {
  await ensureSignalQueueSchema();
  const now = Date.now();
  const sql = `
    SELECT * FROM signal_queue
    WHERE status = 'PENDING' AND candle_close_time <= ?
    ORDER BY candle_close_time ASC
    LIMIT ${limit}
  `;
  return await query<SignalQueueRecord[]>(sql, [now]);
}

export async function updateQueueSignalStatus(
  id: number,
  status: 'PROCESSED' | 'FAILED',
  errorMessage?: string
) {
  await ensureSignalQueueSchema();
  const sql = `
    UPDATE signal_queue
    SET status = ?, processed_at = NOW(), error_message = ?
    WHERE id = ?
  `;
  return await query(sql, [status, errorMessage || null, id]);
}

export async function getQueueStats() {
  await ensureSignalQueueSchema();
  const sql = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'PROCESSED' THEN 1 ELSE 0 END) as processed,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
    FROM signal_queue
  `;
  const rows = await query<any[]>(sql);
  return rows[0] || { total: 0, pending: 0, processed: 0, failed: 0 };
}

