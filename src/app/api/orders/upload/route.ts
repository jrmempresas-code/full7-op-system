/**
 * POST /api/orders/upload
 * Processa um pedido a partir de upload direto (sem e-mail).
 * Body: multipart/form-data
 *   - pdf:          arquivo PDF do pedido (obrigatório)
 *   - imagem:       arquivo de imagem do layout (opcional)
 *   - observacoes:  texto livre (opcional)
 */
import { NextRequest, NextResponse } from 'next/server'
import { processEmail } from '@/lib/email-processor'
import type { ProcessedEmail } from '@/types'

export const dynamic   = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()

    const pdfFile = form.get('pdf') as File | null
    const imgFile = form.get('imagem') as File | null
    const obs     = (form.get('observacoes') as string | null) ?? ''

    if (!pdfFile) {
      return NextResponse.json({ error: 'PDF do pedido é obrigatório' }, { status: 400 })
    }

    // Converte File → Buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
    const imgBuffer = imgFile ? Buffer.from(await imgFile.arrayBuffer()) : null

    // Monta um ProcessedEmail sintético (sem e-mail real)
    const email: ProcessedEmail = {
      from:      'upload-manual@full7.local',
      subject:   `OP - Upload Manual — ${pdfFile.name.replace('.pdf', '')}`,
      body:      obs,
      receivedAt: new Date(),
      attachments: [
        {
          filename:    pdfFile.name,
          contentType: 'application/pdf',
          content:     pdfBuffer,
        },
        ...(imgBuffer && imgFile ? [{
          filename:    imgFile.name,
          contentType: imgFile.type || 'image/jpeg',
          content:     imgBuffer,
        }] : []),
      ],
    }

    const result = await processEmail(email)

    return NextResponse.json(result)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
