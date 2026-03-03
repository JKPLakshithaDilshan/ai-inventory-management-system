-- AI Inventory Management System (PostgreSQL)

-- 0) Extension (needed for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) ROLES
CREATE TABLE IF NOT EXISTS roles (
  id           BIGSERIAL PRIMARY KEY,
  role_name    VARCHAR(50) NOT NULL UNIQUE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) USERS
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      VARCHAR(120) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role_id        BIGINT NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 3) SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(180) NOT NULL,
  email              VARCHAR(255),
  phone              VARCHAR(40),
  address            TEXT,
  reliability_score  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 4) PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              VARCHAR(64) NOT NULL UNIQUE,
  name             VARCHAR(200) NOT NULL,
  category_id      BIGINT REFERENCES product_categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
  unit             VARCHAR(30) NOT NULL DEFAULT 'pcs',
  cost_price       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  selling_price    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  reorder_point    INTEGER NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  min_stock_level  INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  lead_time_days   INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_metadata_gin ON products USING GIN (metadata);

-- 6) WAREHOUSES
CREATE TABLE IF NOT EXISTS warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL UNIQUE,
  address     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7) INVENTORY BALANCES
CREATE TABLE IF NOT EXISTS inventory_balances (
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  product_id    UUID NOT NULL REFERENCES products(id)   ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_product ON inventory_balances(product_id);

-- 8) PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  po_number       VARCHAR(50) UNIQUE,
  status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                  CHECK (status IN ('DRAFT','SENT','PARTIALLY_RECEIVED','RECEIVED','CANCELLED')),
  expected_date   DATE,
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

CREATE TABLE IF NOT EXISTS purchase_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id  UUID NOT NULL REFERENCES purchases(id) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id)  ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost    NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
  received_qty INTEGER NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purchase_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);

-- 9) SALES
CREATE TABLE IF NOT EXISTS sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  invoice_no    VARCHAR(50) UNIQUE,
  status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED','REFUNDED')),
  customer_name VARCHAR(180),
  notes         TEXT,
  created_by    UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

CREATE TABLE IF NOT EXISTS sale_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sale_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- 10) STOCK LEDGER
CREATE TABLE IF NOT EXISTS stock_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id   UUID NOT NULL REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  product_id     UUID NOT NULL REFERENCES products(id)   ON UPDATE CASCADE ON DELETE RESTRICT,
  movement_type  VARCHAR(15) NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT')),
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  reference_type VARCHAR(30),
  reference_id   UUID,
  note           TEXT,
  created_by     UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_warehouse ON stock_ledger(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_created_at ON stock_ledger(created_at);

-- 11) AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  action      VARCHAR(30) NOT NULL,
  table_name  VARCHAR(80),
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- 12) AI FORECASTS
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
  warehouse_id  UUID REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL,
  horizon_days  INTEGER NOT NULL CHECK (horizon_days IN (7, 14, 30, 60, 90)),
  predicted_qty NUMERIC(12,2) NOT NULL CHECK (predicted_qty >= 0),
  model_name    VARCHAR(80) NOT NULL DEFAULT 'baseline',
  metrics       JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecasts_product_time ON demand_forecasts(product_id, generated_at);

-- 13) SEED DATA
INSERT INTO roles (role_name, description)
VALUES
  ('ADMIN', 'Full system access'),
  ('INVENTORY_MANAGER', 'Manage products, suppliers, stock'),
  ('SALES_STAFF', 'Create sales invoices'),
  ('PURCHASING_STAFF', 'Create POs and receive stock'),
  ('AUDITOR', 'Read-only reports and logs')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO warehouses (name, address)
VALUES ('MAIN', 'Main Warehouse')
ON CONFLICT (name) DO NOTHING;