import { NextResponse } from 'next/server'
import { getUnprocessedOpEmails } from '@/lib/gmail/client'
import { processEmail } from '@/lib/email-processor'

export const maxDuration = 300 // 5 minutos (Vercel Pro / hobby tem limite menor)
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const emails = await getUnprocessedOpEmails()

    if (emails.length === 0) {
      return NextResponse.json({ message: 'Nenhum e-mail novo de OP encontrado', processed: 0, details: [] })
    }

    const results = []
    for (const email of emails) {
      const result = await processEmail(email)
      results.push({ subject: email.subject, ...result })
    }

    const successCount = results.filter((r) => r.success).length
    const errorCount   = results.filter((r) => !r.success).length

    return NextResponse.json({
      message: `${emails.length} e-mail(s) processado(s)`,
      processed: successCount,
      errors: errorCount,
      details: results,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET para verificar quantos e-mails pendentes existem
export async function GET() {
  try {
    const { getEmailCount } = await import('@/lib/gmail/client')
    const count = await getEmailCount()
    return NextResponse.json({ pending: count })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
