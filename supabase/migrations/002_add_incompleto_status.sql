-- Adiciona status 'incompleto' para pedidos recebidos sem IA disponível
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'recebido','op_gerada','em_producao','sublimacao',
    'corte','costura','conferencia','pronto','entregue',
    'atrasado','incompleto','erro'
  ));
