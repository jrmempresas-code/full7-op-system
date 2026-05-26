-- Coluna JSONB para armazenar dados extras da ficha técnica
-- (grades separadas, técnicas de customização, ref. de cor, evento)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ficha_dados JSONB DEFAULT '{}';
