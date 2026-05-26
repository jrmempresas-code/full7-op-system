import type { Order } from '@/types'

const BASE = 'https://api.trello.com/1'
const KEY   = process.env.TRELLO_API_KEY!
const TOKEN = process.env.TRELLO_TOKEN!

const auth = `key=${KEY}&token=${TOKEN}`

async function trelloFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${BASE}${path}${separator}${auth}`
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Trello API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// Mapeia status do sistema para lista do Trello
const STATUS_TO_LIST: Record<string, string | undefined> = {
  recebido:    process.env.TRELLO_LIST_RECEBIDO,
  op_gerada:   process.env.TRELLO_LIST_OP_GERADA,
  em_producao: process.env.TRELLO_LIST_EM_PRODUCAO,
  sublimacao:  process.env.TRELLO_LIST_SUBLIMACAO,
  corte:       process.env.TRELLO_LIST_CORTE,
  costura:     process.env.TRELLO_LIST_COSTURA,
  conferencia: process.env.TRELLO_LIST_CONFERENCIA,
  pronto:      process.env.TRELLO_LIST_PRONTO,
  entregue:    process.env.TRELLO_LIST_ENTREGUE,
  atrasado:    process.env.TRELLO_LIST_ATRASADO,
}

function buildCardDescription(order: Order): string {
  const grade = (order.order_sizes ?? [])
    .map((s) => `${s.tamanho}: ${s.quantidade}`)
    .join(' | ')

  const valorFmt = order.valor_total
    ? order.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'N/A'

  return `**Cliente:** ${order.cliente}
**Pedido:** ${order.numero_pedido}
**Data de Entrega:** ${order.data_entrega ?? 'N/A'}
**Valor:** ${valorFmt}
**Quantidade:** ${order.quantidade_total} peças
**Produto:** ${order.produto ?? 'N/A'}
**Tecido:** ${order.tecido ?? 'N/A'}
**Gola:** ${order.gola ?? 'N/A'}
**Manga:** ${order.manga ?? 'N/A'}
**Punho:** ${order.punho ?? 'N/A'}
**Shorts:** ${order.shorts ?? 'N/A'}
**Meião:** ${order.meiao ?? 'N/A'}
**Patch PET 3D:** ${order.patch_3d ? 'SIM' : 'Não'}
**Ribana:** ${order.ribana ? 'Sim' : 'NÃO'}
**Urgência:** ${order.urgencia ? '🔴 URGENTE' : 'Normal'}
**Status:** ${order.status}

**Grade de Tamanhos:**
${grade || 'N/A'}

**Observações:**
${order.observacoes ?? 'Sem observações'}`
}

export async function createTrelloCard(order: Order): Promise<{ id: string; url: string }> {
  // Novos pedidos sempre entram em PEDIDOS NOVOS primeiro
  const listId = process.env.TRELLO_LIST_RECEBIDO ?? process.env.TRELLO_LIST_OP_GERADA
  if (!listId) throw new Error('TRELLO_LIST_ID não configurado')

  const dataEntrega = order.data_entrega
    ? new Date(order.data_entrega).toLocaleDateString('pt-BR')
    : 'N/A'

  const name = `${order.numero_pedido} - ${order.cliente} - Entrega ${dataEntrega}`
  const desc = buildCardDescription(order)

  const card = await trelloFetch<{ id: string; url: string; shortUrl: string }>(
    '/cards',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idList: listId,
        name,
        desc,
        due: order.data_entrega ?? undefined,
      }),
    }
  )

  // Adicionar label de urgência se necessário
  if (order.urgencia) {
    await addUrgencyLabel(card.id)
  }

  return { id: card.id, url: card.shortUrl ?? card.url }
}

async function addUrgencyLabel(cardId: string): Promise<void> {
  const boardId = process.env.TRELLO_BOARD_ID
  if (!boardId) return

  try {
    const labels = await trelloFetch<Array<{ id: string; name: string; color: string }>>(
      `/boards/${boardId}/labels`
    )
    const urgLabel = labels.find((l) => l.name.toLowerCase().includes('urgent') || l.color === 'red')
    if (urgLabel) {
      await trelloFetch(`/cards/${cardId}/idLabels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: urgLabel.id }),
      })
    }
  } catch {
    // label não encontrada, ignorar
  }
}

export async function attachFilesToCard(
  cardId: string,
  attachments: Array<{ name: string; url: string }>
): Promise<void> {
  for (const att of attachments) {
    await trelloFetch(`/cards/${cardId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: att.name, url: att.url }),
    })
  }
}

export async function moveCardToList(cardId: string, status: string): Promise<void> {
  const listId = STATUS_TO_LIST[status]
  if (!listId) return

  await trelloFetch(`/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idList: listId }),
  })
}

export async function updateCardDescription(cardId: string, order: Order): Promise<void> {
  await trelloFetch(`/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ desc: buildCardDescription(order) }),
  })
}

export async function getBoardCards(): Promise<
  Array<{ id: string; name: string; idList: string; desc: string; due: string | null; shortUrl: string }>
> {
  const boardId = process.env.TRELLO_BOARD_ID
  if (!boardId) return []

  return trelloFetch(`/boards/${boardId}/cards?fields=id,name,idList,desc,due,shortUrl`)
}

export async function getBoardLists(): Promise<Array<{ id: string; name: string }>> {
  const boardId = process.env.TRELLO_BOARD_ID
  if (!boardId) return []

  return trelloFetch(`/boards/${boardId}/lists?fields=id,name`)
}
