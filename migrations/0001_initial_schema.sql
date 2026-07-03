-- Migration number: 0001 	 2026-07-03T17:32:50.099Z

-- Current snapshot of every scraped product, upserted on (provider, sku) every cron tick.
CREATE TABLE products (
  provider TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  weight_g REAL,
  stock_status TEXT NOT NULL,
  buy_price_ron REAL,
  sell_price_ron REAL,
  sell_price_per_g_ron REAL,
  buy_price_per_g_ron REAL,
  metal TEXT NOT NULL CHECK (metal IN ('Gold', 'Silver', 'Platinum', 'Palladium')),
  purity REAL,
  karats REAL,
  fine_weight_g REAL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, sku)
);

CREATE INDEX idx_products_metal ON products(metal);
CREATE INDEX idx_products_updated_at ON products(updated_at);

-- Append-only price history. A row is written only when a product's price actually
-- changes since the last tick — see D1ProductRepository. Not on every cron run.
CREATE TABLE price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  sku TEXT NOT NULL,
  sell_price_ron REAL,
  buy_price_ron REAL,
  sell_price_per_g_ron REAL,
  buy_price_per_g_ron REAL,
  recorded_at TEXT NOT NULL
);

CREATE INDEX idx_price_history_provider_sku_time ON price_history(provider, sku, recorded_at);

-- Current BNR gold benchmark rate. Single row, upserted every cron tick.
CREATE TABLE benchmark (
  source TEXT PRIMARY KEY,
  metal TEXT NOT NULL DEFAULT 'Gold',
  date TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON',
  updated_at TEXT NOT NULL
);

-- Append-only benchmark history, written only when BNR's published rate actually changes
-- (BNR updates once a day, so this is a handful of rows/day, not one per cron tick).
CREATE TABLE benchmark_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  metal TEXT NOT NULL DEFAULT 'Gold',
  date TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON',
  recorded_at TEXT NOT NULL
);

CREATE INDEX idx_benchmark_history_time ON benchmark_history(source, recorded_at);
