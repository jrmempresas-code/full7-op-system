-- ============================================================
-- FULL7 OP SYSTEM - Schema inicial
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente           TEXT NOT NULL,
  numero_pedido     TEXT NOT NULL UNIQUE,
  data_pedido       DATE,
  data_entrega      DATE,
  despachar_ate     DATE,
  vendedor          TEXT,
  produto           TEXT,
  modelo            TEXT,
  tecido            TEXT,
  composicao        TEXT,
  gola              TEXT,
  manga             TEXT,
  punho             TEXT,
  shorts            TEXT,
  meiao             TEXT,
  patch_3d          BOOLEAN DEFAULT FALSE,
  ribana            BOOLEAN DEFAULT TRUE,
  quantidade_total  INTEGER DEFAULT 0,
  valor_total       NUMERIC(10, 2),
  status            TEXT NOT NULL DEFAULT 'recebido'
                    CHECK (status IN (
                      'recebido','op_gerada','em_producao','sublimacao',
                      'corte','costura','conferencia','pronto','entregue',
                      'atrasado','erro'
                    )),
  urgencia          BOOLEAN DEFAULT FALSE,
  observacoes       TEXT,
  trello_card_id    TEXT,
  trello_card_url   TEXT,
  op_pdf_url        TEXT,
  pedido_pdf_url    TEXT,
  layout_image_url  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: order_sizes
-- ============================================================
CREATE TABLE IF NOT EXISTS order_sizes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tamanho    TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  UNIQUE(order_id, tamanho)
);

-- ============================================================
-- TABELA: processing_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS processing_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  etapa      TEXT NOT NULL
             CHECK (etapa IN (
               'email_recebido','anexos_baixados','dados_extraidos',
               'op_gerada','card_criado','dashboard_atualizado',
               'concluido','erro'
             )),
  status     TEXT NOT NULL DEFAULT 'em_andamento'
             CHECK (status IN ('sucesso','erro','em_andamento')),
  mensagem   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_data_entrega ON orders(data_entrega);
CREATE INDEX IF NOT EXISTS idx_orders_urgencia     ON orders(urgencia);
CREATE INDEX IF NOT EXISTS idx_orders_cliente      ON orders(cliente);
CREATE INDEX IF NOT EXISTS idx_order_sizes_order   ON order_sizes(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_order          ON processing_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_created        ON processing_logs(created_at DESC);

-- ============================================================
-- TRIGGER: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEW: dashboard stats
-- ============================================================
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE status NOT IN ('entregue','erro'))          AS em_producao,
  COUNT(*) FILTER (WHERE data_entrega BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)
                                                                      AS pedidos_semana,
  COUNT(*) FILTER (WHERE data_entrega < CURRENT_DATE
                    AND status NOT IN ('entregue','pronto'))          AS atrasados,
  COUNT(*) FILTER (WHERE urgencia = TRUE
                    AND status NOT IN ('entregue'))                   AS urgentes,
  COUNT(*) FILTER (WHERE status = 'pronto')                          AS prontos,
  COUNT(*) FILTER (WHERE status = 'entregue'
                    AND updated_at >= DATE_TRUNC('month', NOW()))     AS entregues_mes,
  COALESCE(SUM(valor_total) FILTER (
    WHERE status NOT IN ('entregue','erro')), 0)                      AS valor_em_producao,
  COALESCE(SUM(valor_total) FILTER (
    WHERE status NOT IN ('entregue','erro','pronto')), 0)             AS valor_em_aberto,
  COALESCE(SUM(quantidade_total) FILTER (
    WHERE status NOT IN ('entregue','erro')), 0)                      AS quantidade_total_pecas
FROM orders;

-- ============================================================
-- RLS (Row Level Security) - habilitar após configurar auth
-- ============================================================
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_sizes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;
