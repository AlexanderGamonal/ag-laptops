-- ============================================================
-- Tabla de eventos de analytics del storefront
-- ============================================================
CREATE TABLE IF NOT EXISTS store_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  path       TEXT,
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_events_name       ON store_events(name);
CREATE INDEX IF NOT EXISTS idx_store_events_created_at ON store_events(created_at DESC);

ALTER TABLE store_events ENABLE ROW LEVEL SECURITY;

-- Escritura pública (anon) — solo INSERT, nunca SELECT/UPDATE/DELETE
CREATE POLICY "Inserción pública de eventos"
  ON store_events FOR INSERT
  TO anon
  WITH CHECK (true);

-- Lectura completa para autenticados (admin)
CREATE POLICY "Admin lectura de eventos"
  ON store_events FOR SELECT
  TO authenticated
  USING (true);
