import { NextRequest, NextResponse } from 'next/server'
import { getOrders, getDashboardStats } from '@/lib/supabase/client'
import type { OrderStatus } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl

    const filters: Record<string, string | boolean | undefined> = {}

    const status = searchParams.get('status')
    if (status) filters.status = status as OrderStatus

    const urgencia = searchParams.get('urgencia')
    if (urgencia === 'true') filters.urgencia = true

    const cliente = searchParams.get('cliente')
    if (cliente) filters.cliente = cliente

    const numeroPedido = searchParams.get('numero_pedido')
    if (numeroPedido) filters.numeroPedido = numeroPedido

    const dataInicio = searchParams.get('data_inicio')
    if (dataInicio) filters.dataInicio = dataInicio

    const dataFim = searchParams.get('data_fim')
    if (dataFim) filters.dataFim = dataFim

    const [orders, stats] = await Promise.all([
      getOrders(filters as Parameters<typeof getOrders>[0]),
      searchParams.get('stats') === 'true' ? getDashboardStats() : null,
    ])

    return NextResponse.json({ orders, stats })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
