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

