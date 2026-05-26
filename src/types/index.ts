export type OrderStatus =
  | 'recebido'
  | 'op_gerada'
  | 'em_producao'
  | 'sublimacao'
  | 'corte'
  | 'costura'
  | 'conferencia'
  | 'pronto'
  | 'entregue'
  | 'atrasado'
  | 'incompleto'
  | 'erro'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recebido:     'Recebido',
  op_gerada:    'OP Gerada',
  em_producao:  'Em Produção',
  sublimacao:   'Sublimação',
  corte:        'Corte',
  costura:      'Costura',
  conferencia:  'Conferência',
  pronto:       'Pronto',
  entregue:     'Entregue',
  atrasado:     'Atrasado',
  incompleto:   'Incompleto',
  erro:         'Erro',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  recebido:     'bg-slate-100 text-slate-700',
  op_gerada:    'bg-blue-100 text-blue-700',
  em_producao:  'bg-indigo-100 text-indigo-700',
  sublimacao:   'bg-violet-100 text-violet-700',
  corte:        'bg-orange-100 text-orange-700',
  costura:      'bg-amber-100 text-amber-700',
  conferencia:  'bg-yellow-100 text-yellow-700',
  pronto:       'bg-green-100 text-green-700',
  entregue:     'bg-emerald-100 text-emerald-700',
  atrasado:     'bg-red-100 text-red-700',
  incompleto:   'bg-amber-100 text-amber-700',
  erro:         'bg-rose-100 text-rose-700',
}

export type ProcessingStep =
  | 'email_recebido'
  | 'anexos_baixados'
  | 'dados_extraidos'
  | 'op_gerada'
  | 'card_criado'
  | 'dashboard_atualizado'
  | 'concluido'
  | 'erro'

export interface OrderSize {
  id: string
  order_id: string
  tamanho: string
  quantidade: number
}

// Dados extras da ficha técnica (armazenados como JSONB no banco)
export interface FichaDados {
  evento?:        string                         // "SIM" | "NÃO"
  ref_cor?:       string                         // "AMARELO/VERDE — SUBLIMADA"
  customizacao?:  string                         // "SUBLIMAÇÃO TOTAL"
  tecnicas?:      Record<string, string[]>       // {"Sublimação":["FRENTE","COSTA"],"Patch":["PEITO ESQ."]}
  grade_infantil?: Record<string, number>        // {"02":0,"04":3,"06":3,...}
  grade_adulto?:  Record<string, number>         // {"PP":0,"P":5,"M":10,...}
  grade_baby?:    Record<string, number>         // baby look feminino
  shorts_inf?:    Record<string, number>
  shorts_adu?:    Record<string, number>
}

export interface Order {
  id: string
  cliente: string
  numero_pedido: string
  data_pedido: string | null
  data_entrega: string | null
  despachar_ate: string | null
  vendedor: string | null
  produto: string | null
  modelo: string | null
  tecido: string | null
  composicao: string | null
  gola: string | null
  manga: string | null
  punho: string | null
  shorts: string | null
  meiao: string | null
  patch_3d: boolean
  ribana: boolean
  quantidade_total: number
  valor_total: number | null
  status: OrderStatus
  urgencia: boolean
  observacoes: string | null
  ficha_dados?: FichaDados | null
  trello_card_id: string | null
  trello_card_url: string | null
  op_pdf_url: string | null
  pedido_pdf_url: string | null
  layout_image_url: string | null
  created_at: string
  updated_at: string
  order_sizes?: OrderSize[]
}

export interface ProcessingLog {
  id: string
  order_id: string
  etapa: ProcessingStep
  status: 'sucesso' | 'erro' | 'em_andamento'
  mensagem: string | null
  created_at: string
}

export interface ExtractedOrderData {
  cliente: string
  numero_pedido: string
  data_pedido: string | null
  data_entrega: string | null
  despachar_ate: string | null
  vendedor: string | null
  produto: string | null
  modelo: string | null
  tecido: string | null
  composicao: string | null
  gola: string | null
  manga: string | null
  punho: string | null
  shorts: string | null
  meiao: string | null
  patch_3d: boolean
  ribana: boolean
  quantidade_total: number
  valor_total: number | null
  urgencia: boolean
  observacoes: string | null
  // Grade flat (todos os tamanhos — vai para order_sizes)
  grade: Array<{ tamanho: string; quantidade: number }>
  // Dados extras para a ficha técnica
  ficha_dados: FichaDados
}

export interface DashboardStats {
  em_producao: number
  pedidos_semana: number
  atrasados: number
  urgentes: number
  prontos: number
  entregues_mes: number
  valor_em_producao: number
  valor_em_aberto: number
  quantidade_total_pecas: number
}

export interface EmailAttachment {
  filename: string
  contentType: string
  content: Buffer
}

export interface ProcessedEmail {
  from: string
  subject: string
  body: string
  attachments: EmailAttachment[]
  receivedAt: Date
}
