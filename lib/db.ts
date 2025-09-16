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

