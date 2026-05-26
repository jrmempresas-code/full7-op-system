import { NextRequest, NextResponse } from 'next/server'
import { getOrderById, updateOrder, createLog, upsertOrderSizes, uploadFile } from '@/lib/supabase/client'
import { generateOpPdf } from '@/lib/pdf/generator'
import { createTrelloCard, attachFilesToCard, updateCardDescription } from '@/lib/trello/client'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const orderId = params.id

  try {
    const order = await getOrderById(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    await createLog(orderId, 'op_gerada', 'em_andamento', 'Reprocessando OP...')
    await updateOrder(orderId, { status: 'recebido' })

    // Buscar imagem de layout se existir
    let layoutImageBytes: Buffer | undefined
    if (order.layout_image_url) {
      try {
        const imgRes = await fetch(order.layout_image_url)
        const buf = await imgRes.arrayBuffer()
        layoutImageBytes = Buffer.from(buf)
      } catch {
        // continua sem imagem
      }
    }

    // Regen OP PDF
    const opPdfBytes = await generateOpPdf(order, layoutImageBytes)
    const opPdfUrl = await uploadFile(
      process.env.STORAGE_BUCKET_OPS ?? 'ops',
      `OP_${order.numero_pedido}_${order.cliente.replace(/\s+/g, '_')}.pdf`,
      Buffer.from(opPdfBytes),
      'application/pdf'
    )

    await createLog(orderId, 'op_gerada', 'sucesso', `OP regeada: ${opPdfUrl}`)
    await updateOrder(orderId, { op_pdf_url: opPdfUrl, status: 'op_gerada' })

    // Atualizar ou criar card Trello
    const refreshed = await getOrderById(orderId)
    if (!refreshed) throw new Error('Pedido não encontrado após update')

    if (refreshed.trello_card_id) {
      await updateCardDescription(refreshed.trello_card_id, refreshed)
      await createLog(orderId, 'card_criado', 'sucesso', 'Card Trello atualizado')
    } else {
      const card = await createTrelloCard(refreshed)
      const attachments = [{ name: `OP_${refreshed.numero_pedido}.pdf`, url: opPdfUrl }]
      if (refreshed.pedido_pdf_url) attachments.push({ name: `Pedido_${refreshed.numero_pedido}.pdf`, url: refreshed.pedido_pdf_url })
      await attachFilesToCard(card.id, attachments)
      await updateOrder(orderId, { trello_card_id: card.id, trello_card_url: card.url })
      await createLog(orderId, 'card_criado', 'sucesso', `Card criado: ${card.url}`)
    }

    await createLog(orderId, 'concluido', 'sucesso', 'Reprocessamento concluído')

    return NextResponse.json({ success: true, op_pdf_url: opPdfUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    await createLog(orderId, 'erro', 'erro', msg)
    await updateOrder(orderId, { status: 'erro' })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
