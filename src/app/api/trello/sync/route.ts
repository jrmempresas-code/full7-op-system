import { NextResponse } from 'next/server'
import { getBoardCards, getBoardLists } from '@/lib/trello/client'
import { getOrders, updateOrder } from '@/lib/supabase/client'
import type { OrderStatus } from '@/types'

export const dynamic = 'force-dynamic'

// Mapeia nome da lista Trello → status do sistema
const LIST_NAME_TO_STATUS: Record<string, OrderStatus> = {
  'Recebido':   'recebido',
  'OP Gerada':  'op_gerada',
  'Em Produção':'em_producao',
  'Sublimação': 'sublimacao',
  'Corte':      'corte',
  'Costura':    'costura',
  'Conferência':'conferencia',
  'Pronto':     'pronto',
  'Entregue':   'entregue',
  'Atrasado':   'atrasado',
}

export async function POST() {
  try {
    const [cards, lists, orders] = await Promise.all([
      getBoardCards(),
      getBoardLists(),
      getOrders(),
    ])

    const listMap: Record<string, string> = {}
    for (const list of lists) {
      listMap[list.id] = list.name
    }

    let synced = 0
    for (const card of cards) {
      const listName = listMap[card.idList]
      const newStatus = LIST_NAME_TO_STATUS[listName]
      if (!newStatus) continue

      const order = orders.find((o) => o.trello_card_id === card.id)
      if (!order) continue

      if (order.status !== newStatus) {
        await updateOrder(order.id, { status: newStatus })
        synced++
      }
    }

    return NextResponse.json({ message: `${synced} pedido(s) sincronizado(s) com Trello`, synced })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
