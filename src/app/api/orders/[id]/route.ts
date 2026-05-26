import { NextRequest, NextResponse } from 'next/server'
import { getOrderById, updateOrder, getOrderLogs } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [order, logs] = await Promise.all([
      getOrderById(params.id),
      getOrderLogs(params.id),
    ])

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ order, logs })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const order = await updateOrder(params.id, body)
    return NextResponse.json({ order })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
