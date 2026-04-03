-- ============================================================
-- Tabla principal de laptops
-- ============================================================
CREATE TABLE IF NOT EXISTS laptops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_parte  TEXT UNIQUE NOT NULL,
  descripcion   TEXT,
  precio        NUMERIC(10, 2),
  condicion     TEXT,               -- Nuevo, Usado, Reacondicionado
  estado        TEXT,               -- Disponible, Agotado, Reservado
  foto_1        TEXT,               -- URL pública en Supabase Storage
  foto_2        TEXT,
  foto_3        TEXT,
  activo        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda y filtrado
CREATE INDEX IF NOT EXISTS idx_laptops_activo ON laptops(activo);
CREATE INDEX IF NOT EXISTS idx_laptops_condicion ON laptops(condicion);
CREATE INDEX IF NOT EXISTS idx_laptops_estado ON laptops(estado);
CREATE INDEX IF NOT EXISTS idx_laptops_precio ON laptops(precio);
CREATE INDEX IF NOT EXISTS idx_laptops_numero_parte ON laptops(numero_parte);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER laptops_updated_at
  BEFORE UPDATE ON laptops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE laptops ENABLE ROW LEVEL SECURITY;

-- Lectura pública solo de laptops activas
CREATE POLICY "Lectura pública de laptops activas"
  ON laptops FOR SELECT
  TO anon
  USING (activo = true);

-- Lectura completa para usuarios autenticados (admin)
CREATE POLICY "Admin lectura completa"
  ON laptops FOR SELECT
  TO authenticated
  USING (true);

-- Escritura solo para usuarios autenticados (admin)
CREATE POLICY "Admin puede insertar"
  ON laptops FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin puede actualizar"
  ON laptops FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin puede eliminar"
  ON laptops FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- Storage: bucket laptop-photos
-- (Ejecutar en el dashboard de Supabase o via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('laptop-photos', 'laptop-photos', true)
-- ON CONFLICT (id) DO NOTHING;
