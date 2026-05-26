/**
 * GET /api/test-pipeline
 * Verifica cada componente do sistema individualmente.
 * Útil para diagnóstico sem precisar enviar e-mail real.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, { ok: boolean; detail: string }> = {}

  // 1. Supabase DB
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('count')
      .limit(1)
    if (error) throw error
    results.supabase_db = { ok: true, detail: 'Conexão com banco OK' }
  } catch (e: unknown) {
    results.supabase_db = { ok: false, detail: String(e) }
  }

  // 2. Supabase Storage — cada bucket
  const buckets = [
    process.env.STORAGE_BUCKET_OPS     ?? 'ops',
    process.env.STORAGE_BUCKET_PEDIDOS ?? 'pedidos',
    process.env.STORAGE_BUCKET_LAYOUTS ?? 'layouts',
  ]
  for (const bucket of buckets) {
    try {
      const { data, error } = await supabaseAdmin.storage.from(bucket).list('', { limit: 1 })
      if (error) throw error
      results[`bucket_${bucket}`] = { ok: true, detail: `Bucket "${bucket}" acessível` }
    } catch (e: unknown) {
      results[`bucket_${bucket}`] = { ok: false, detail: `Bucket "${bucket}": ${String(e)}` }
    }
  }

  // 3. Anthropic AI
  try {
    const client = new Anthropic({ apiKey: process.env.AI_API_KEY })
    const model  = process.env.AI_MODEL ?? 'claude-opus-4-5'
    const res = await client.messages.create({
      model,
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Responda apenas: OK' }],
    })
    const reply = res.content.find((b) => b.type === 'text')?.text ?? ''
    results.anthropic_ai = { ok: true, detail: `Modelo ${model} respondeu: "${reply.trim()}"` }
  } catch (e: unknown) {
    results.anthropic_ai = { ok: false, detail: String(e) }
  }

  // 4. Trello — listar cards do board
  try {
    const key   = process.env.TRELLO_API_KEY
    const token = process.env.TRELLO_TOKEN
    const board = process.env.TRELLO_BOARD_ID
    if (!key || !token || !board) throw new Error('TRELLO_API_KEY / TOKEN / BOARD_ID não configurados')
    const res = await fetch(
      `https://api.trello.com/1/boards/${board}/lists?key=${key}&token=${token}`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const lists = await res.json() as Array<{ id: string; name: string }>
    results.trello = { ok: true, detail: `${lists.length} lista(s) encontrada(s) no board` }
  } catch (e: unknown) {
    results.trello = { ok: false, detail: String(e) }
  }

  // 5. Gmail
  try {
    const { google } = await import('googleapis')
    const oauth2 = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    )
    oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
    const gmail = google.gmail({ version: 'v1', auth: oauth2 })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    results.gmail = { ok: true, detail: `Conta: ${profile.data.emailAddress} | ${profile.data.messagesTotal} msgs` }
  } catch (e: unknown) {
    results.gmail = { ok: false, detail: String(e) }
  }

  const allOk = Object.values(results).every((r) => r.ok)

  return NextResponse.json({
    status: allOk ? '✅ Tudo OK' : '⚠️ Há problemas',
    results,
  })
}
