import { createClient } from '@supabase/supabase-js'
import type { Order, OrderSize, ProcessingLog, OrderStatus, ProcessingStep } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente público (frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente admin (backend / API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

// ============================================================
// Funções de Orders
// ============================================================

export async function getOrders(filters?: {
  status?: OrderStatus
  urgencia?: boolean
  cliente?: string
  numeroPedido?: string
  dataInicio?: string
  dataFim?: string
}, sortDirection: 'asc' | 'desc' = 'desc'): Promise<Order[]> {
  let query = supabaseAdmin
    .from('orders')
    .select('*, order_sizes(*)')
    .order('created_at', { ascending: sortDirection === 'asc' })

  if (filters?.status)        query = query.eq('status', filters.status)
  if (filters?.urgencia)      query = query.eq('urgencia', true)
  if (filters?.cliente)       query = query.ilike('cliente', `%${filters.cliente}%`)
  if (filters?.numeroPedido)  query = query.ilike('numero_pedido', `%${filters.numeroPedido}%`)
  if (filters?.dataInicio)    query = query.gte('data_entrega', filters.dataInicio)
  if (filters?.dataFim)       query = query.lte('data_entrega', filters.dataFim)

  const { data, error } = await query
  if (error) throw error
  return data as Order[]
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_sizes(*)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Order
}

export async function getOrderByNumeroPedido(numeroPedido: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_sizes(*)')
    .eq('numero_pedido', numeroPedido)
    .single()

  if (error) return null
  return data as Order
}

export async function createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_sizes'>): Promise<Order> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert(order)
    .select()
    .single()

  if (error) throw error
  return data as Order
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Order
}

export async function upsertOrderSizes(orderId: string, sizes: Array<{ tamanho: string; quantidade: number }>): Promise<void> {
  if (!sizes.length) return

  await supabaseAdmin.from('order_sizes').delete().eq('order_id', orderId)

  const { error } = await supabaseAdmin.from('order_sizes').insert(
    sizes.map((s) => ({ order_id: orderId, tamanho: s.tamanho, quantidade: s.quantidade }))
  )

  if (error) throw error
}

export async function getDashboardStats() {
  const { data, error } = await supabaseAdmin.from('dashboard_stats').select('*').single()
  if (error) throw error
  return data
}

export async function getUpcomingDeliveries(days = 7): Promise<Order[]> {
  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_sizes(*)')
    .gte('data_entrega', today)
    .lte('data_entrega', future)
    .not('status', 'in', '("entregue","erro")')
    .order('data_entrega', { ascending: true })

  if (error) throw error
  return data as Order[]
}

// ============================================================
// Funções de Logs
// ============================================================

export async function createLog(
  orderId: string | null,
  etapa: ProcessingStep,
  status: 'sucesso' | 'erro' | 'em_andamento',
  mensagem?: string
): Promise<void> {
  await supabaseAdmin.from('processing_logs').insert({
    order_id: orderId,
    etapa,
    status,
    mensagem: mensagem ?? null,
  })
}

export async function getOrderLogs(orderId: string): Promise<ProcessingLog[]> {
  const { data, error } = await supabaseAdmin
    .from('processing_logs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as ProcessingLog[]
}

export async function getRecentLogs(limit = 50): Promise<ProcessingLog[]> {
  const { data, error } = await supabaseAdmin
    .from('processing_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ProcessingLog[]
}

// ============================================================
// Storage helpers
// ============================================================

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
