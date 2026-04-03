-- Agregar columna marca (Lenovo, Asus, HP, Dell, etc.)
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS marca TEXT;

-- Agregar columna part_number (código del fabricante / UPC)
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS part_number TEXT;

-- Índice para filtrar por marca
CREATE INDEX IF NOT EXISTS idx_laptops_marca ON laptops(marca);
