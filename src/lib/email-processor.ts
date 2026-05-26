import pdfParse from 'pdf-parse'
import type { ProcessedEmail, ExtractedOrderData } from '@/types'
import { extractOrderData } from './ai/extractor'
import { extractOrderDataFallback } from './ai/fallback-extractor'
import { generateOpPdf } from './pdf/generator'
import {
  createOrder, updateOrder, upsertOrderSizes, uploadFile, createLog, getOrderByNumeroPedido
} from './supabase/client'
import { createTrelloCard, attachFilesToCard } from './trello/client'

export async function processEmail(email: ProcessedEmail): Promise<{ success: boolean; orderId?: string; error?: string }> {
  let orderId: string | undefined

  try {
    // 1. Localizar PDF e imagem nos anexos
    const pdfAttachment = email.attachments.find(
      (a) => a.contentType === 'application/pdf' || a.filename.endsWith('.pdf')
    )
    const imageAttachment = email.attachments.find(
      (a) => a.contentType.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(a.filename)
    )

    await createLog(null, 'email_recebido', 'sucesso', `E-mail de: ${email.from} | Assunto: ${email.subject}`)

    if (!pdfAttachment) {
      const anexos = email.attachments.map(a => `${a.filename} (${a.contentType})`).join(', ') || 'nenhum anexo'
      await createLog(null, 'anexos_baixados', 'erro',
        `PDF do pedido não encontrado. Anexos recebidos: ${anexos}. O e-mail deve ter um arquivo .pdf do pedido.`)
      return { success: false, error: `PDF não encontrado. Anexos no e-mail: ${anexos}` }
    }

    await createLog(null, 'anexos_baixados', 'sucesso',
      `PDF: ${pdfAttachment.filename}${imageAttachment ? ` | Imagem: ${imageAttachment.filename}` : ' | Sem imagem de layout'}`)

    // 2. Extrair texto do PDF
    const pdfData = await pdfParse(pdfAttachment.content)
    const pdfText = pdfData.text

    // 3. Converter imagem para base64 se existir (limite: 1MB)
    const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1MB
    let imageBase64: string | undefined
    if (imageAttachment) {
      if (imageAttachment.content.length <= MAX_IMAGE_BYTES) {
        imageBase64 = imageAttachment.content.toString('base64')
      } else {
        console.warn(`[processEmail] Imagem ${imageAttachment.filename} muito grande (${(imageAttachment.content.length / 1024).toFixed(0)}KB) — enviando só o PDF para a IA`)
        await createLog(null, 'anexos_baixados', 'em_andamento',
          `Imagem ${imageAttachment.filename} (${(imageAttachment.content.length / 1024).toFixed(0)}KB) ignorada pela IA por exceder 1MB. Será salva no Storage normalmente.`)
      }
    }

    // 4. Extrair dados via IA — com fallback se a API não estiver disponível
    let extractedData: ExtractedOrderData
    let usouFallback = false

    try {
      extractedData = await extractOrderData({ pdfText, emailBody: email.body, imageBase64 })
    } catch (aiErr: unknown) {
      const aiMsg = aiErr instanceof Error ? aiErr.message : String(aiErr)
      console.warn('[processEmail] IA indisponível, usando extração básica:', aiMsg)
      await createLog(null, 'dados_extraidos', 'em_andamento',
        `IA indisponível (${aiMsg.substring(0, 120)}). Usando extração básica — pedido criado como INCOMPLETO.`)
      extractedData = extractOrderDataFallback({
        emailSubject: email.subject,
        emailBody:    email.body,
        emailFrom:    email.from,
      })
      usouFallback = true
    }

    // 5. Verificar se pedido já existe
    const existing = await getOrderByNumeroPedido(extractedData.numero_pedido)
    if (existing) {
      await createLog(existing.id, 'dados_extraidos', 'erro', `Pedido ${extractedData.numero_pedido} já existe`)
      return { success: false, error: `Pedido ${extractedData.numero_pedido} já cadastrado` }
    }

    // 6. Criar pedido no banco
    const status = usouFallback ? 'incompleto' : 'recebido'
    const order = await createOrder({
      ficha_dados:      extractedData.ficha_dados ?? null,
      cliente:          extractedData.cliente,
      numero_pedido:    extractedData.numero_pedido,
      data_pedido:      extractedData.data_pedido,
      data_entrega:     extractedData.data_entrega,
      despachar_ate:    extractedData.despachar_ate,
      vendedor:         extractedData.vendedor,
      produto:          extractedData.produto,
      modelo:           extractedData.modelo,
      tecido:           extractedData.tecido,
      composicao:       extractedData.composicao,
      gola:             extractedData.gola,
      manga:            extractedData.manga,
      punho:            extractedData.punho,
      shorts:           extractedData.shorts,
      meiao:            extractedData.meiao,
      patch_3d:         extractedData.patch_3d,
      ribana:           extractedData.ribana,
      quantidade_total: extractedData.quantidade_total,
      valor_total:      extractedData.valor_total,
      status,
      urgencia:         extractedData.urgencia,
      observacoes:      extractedData.observacoes,
      trello_card_id:   null,
      trello_card_url:  null,
      op_pdf_url:       null,
      pedido_pdf_url:   null,
      layout_image_url: null,
    })

    orderId = order.id

    if (usouFallback) {
      await createLog(orderId, 'dados_extraidos', 'sucesso',
        `Pedido criado como INCOMPLETO (sem IA). Cliente: ${extractedData.cliente} | Número: ${extractedData.numero_pedido}. Complete os dados na tela do pedido.`)
    } else {
      await createLog(orderId, 'dados_extraidos', 'sucesso',
        `Dados extraídos: ${extractedData.quantidade_total} peças para ${extractedData.cliente}`)
    }

    // Salvar grade de tamanhos
    if (extractedData.grade?.length > 0) {
      await upsertOrderSizes(orderId, extractedData.grade)
    }

    // 7. Upload do PDF original do pedido
    let pedidoPdfUrl: string | undefined
    try {
      pedidoPdfUrl = await uploadFile(
        process.env.STORAGE_BUCKET_PEDIDOS ?? 'pedidos',
        `${order.numero_pedido}/pedido_original.pdf`,
        pdfAttachment.content,
        'application/pdf'
      )
      await updateOrder(orderId, { pedido_pdf_url: pedidoPdfUrl })
    } catch (e) {
      console.warn('[processEmail] Upload do PDF do pedido falhou:', e)
      // Não fatal — continua o fluxo
    }

    // Upload da imagem de layout
    let layoutImageUrl: string | undefined
    if (imageAttachment) {
      try {
        layoutImageUrl = await uploadFile(
          process.env.STORAGE_BUCKET_LAYOUTS ?? 'layouts',
          `${order.numero_pedido}/layout.${imageAttachment.filename.split('.').pop()}`,
          imageAttachment.content,
          imageAttachment.contentType
        )
        await updateOrder(orderId, { layout_image_url: layoutImageUrl })
      } catch (e) {
        console.warn('[processEmail] Upload da imagem de layout falhou:', e)
      }
    }

    // 8. Gerar OP PDF (apenas se tiver dados completos, i.e. sem fallback)
    if (!usouFallback) {
      try {
        const orderWithSizes = { ...order, order_sizes: extractedData.grade.map((g, i) => ({
          id: i.toString(), order_id: orderId!, tamanho: g.tamanho, quantidade: g.quantidade
        })) }

        const opPdfBytes = await generateOpPdf(
          { ...orderWithSizes, pedido_pdf_url: pedidoPdfUrl ?? null, layout_image_url: layoutImageUrl ?? null },
          imageAttachment?.content
        )

        const opPdfUrl = await uploadFile(
          process.env.STORAGE_BUCKET_OPS ?? 'ops',
          `OP_${order.numero_pedido}_${order.cliente.replace(/\s+/g, '_')}.pdf`,
          Buffer.from(opPdfBytes),
          'application/pdf'
        )

        await createLog(orderId, 'op_gerada', 'sucesso', `OP gerada: ${opPdfUrl}`)
        await updateOrder(orderId, { status: 'op_gerada', op_pdf_url: opPdfUrl })

        // 9. Criar card no Trello
        try {
          const updatedOrder = {
            ...order,
            op_pdf_url:       opPdfUrl,
            pedido_pdf_url:   pedidoPdfUrl ?? null,
            layout_image_url: layoutImageUrl ?? null,
            order_sizes:      orderWithSizes.order_sizes,
          }

          const card = await createTrelloCard(updatedOrder)

          const attachments = [
            { name: `OP_${order.numero_pedido}.pdf`, url: opPdfUrl },
          ]
          if (pedidoPdfUrl)  attachments.push({ name: `Pedido_${order.numero_pedido}.pdf`, url: pedidoPdfUrl })
          if (layoutImageUrl) attachments.push({ name: `Layout_${order.numero_pedido}`, url: layoutImageUrl })

          await attachFilesToCard(card.id, attachments)
          await createLog(orderId, 'card_criado', 'sucesso', `Card Trello: ${card.url}`)
          await updateOrder(orderId, { trello_card_id: card.id, trello_card_url: card.url })
        } catch (trelloErr: unknown) {
          const msg = trelloErr instanceof Error ? trelloErr.message : String(trelloErr)
          console.warn('[processEmail] Trello falhou:', msg)
          await createLog(orderId, 'card_criado', 'erro', `Trello: ${msg}`)
          // Não fatal
        }

        await createLog(orderId, 'concluido', 'sucesso', 'Pedido processado com sucesso')
        await updateOrder(orderId, { status: 'op_gerada' })

      } catch (opErr: unknown) {
        const msg = opErr instanceof Error ? opErr.message : String(opErr)
        console.warn('[processEmail] Geração da OP falhou:', msg)
        await createLog(orderId, 'op_gerada', 'erro', `Falha na geração da OP: ${msg}`)
        await updateOrder(orderId, { status: 'recebido' })
      }
    } else {
      // Com fallback: cria card básico no Trello mesmo sem OP
      try {
        const card = await createTrelloCard({ ...order, order_sizes: [] })
        await createLog(orderId, 'card_criado', 'sucesso', `Card Trello criado (incompleto): ${card.url}`)
        await updateOrder(orderId, { trello_card_id: card.id, trello_card_url: card.url })
      } catch (trelloErr: unknown) {
        const msg = trelloErr instanceof Error ? trelloErr.message : String(trelloErr)
        await createLog(orderId, 'card_criado', 'erro', `Trello: ${msg}`)
      }

      await createLog(orderId, 'concluido', 'sucesso',
        'Pedido salvo como INCOMPLETO. Acesse o pedido no dashboard para preencher os dados manualmente.')
    }

    return { success: true, orderId }

  } catch (err: unknown) {
    // Serializa qualquer tipo de erro corretamente
    let msg: string
    if (err instanceof Error) {
      msg = err.message
    } else if (typeof err === 'object' && err !== null) {
      msg = JSON.stringify(err)
    } else {
      msg = String(err)
    }
    console.error('[processEmail] Erro no processamento:', err)
    if (orderId) {
      await createLog(orderId, 'erro', 'erro', msg).catch(() => {})
      await updateOrder(orderId, { status: 'erro' }).catch(() => {})
    } else {
      await createLog(null, 'erro', 'erro', `Erro (antes de criar pedido): ${msg}`).catch(() => {})
    }
    return { success: false, orderId, error: msg }
  }
}
