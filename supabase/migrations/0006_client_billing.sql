-- =============================================================
-- 0006_client_billing.sql
-- New table: client_billing
-- One row per client per month for billing data entry (D-13).
-- Supports EUR and USD with stored FX rate per entry (D-16).
-- =============================================================

CREATE TABLE client_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  year_month date NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  fx_rate_to_eur numeric,
  eur_equivalent numeric NOT NULL,
  billing_type text,
  notes text,
  entered_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year_month)
);

-- Constraint: fx_rate required when currency is not EUR (D-16)
ALTER TABLE client_billing ADD CONSTRAINT chk_fx_rate
  CHECK (currency = 'EUR' OR fx_rate_to_eur IS NOT NULL);

-- Constraint: billing_type must be null, 'retainer', or 'project' (D-13b)
ALTER TABLE client_billing ADD CONSTRAINT chk_billing_type
  CHECK (billing_type IS NULL OR billing_type IN ('retainer', 'project'));

-- Constraint: currency must be EUR or USD (D-16)
ALTER TABLE client_billing ADD CONSTRAINT chk_currency
  CHECK (currency IN ('EUR', 'USD'));

-- Enable Row Level Security (T-03-04)
ALTER TABLE client_billing ENABLE ROW LEVEL SECURITY;
