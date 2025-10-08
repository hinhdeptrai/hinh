-- Migration: Create symbol_indicator_settings table
-- Date: 2025-01-08
-- Description: Stores indicator preferences per symbol+timeframe

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

-- Seed default values for common symbols
INSERT IGNORE INTO symbol_indicator_settings (symbol, timeframe, indicator_type, settings)
VALUES
  ('BTCUSDT', '4h', 'FIBONACCI_ALGO', NULL),
  ('ETHUSDT', '4h', 'FIBONACCI_ALGO', NULL),
  ('BNBUSDT', '4h', 'FIBONACCI_ALGO', NULL);

-- Verify table creation
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME,
  UPDATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'symbol_indicator_settings';
