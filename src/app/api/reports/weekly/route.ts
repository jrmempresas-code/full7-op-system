import { NextResponse } from 'next/server'
import { buildWeeklyReportData, buildHtmlReport, sendWeeklyReport } from '@/lib/reports/weekly'

// ── GET — preview do relatório no browser ────────────────────────────────────
export async function GET() {
  try {
    const data = await buildWeeklyReportData()
    const html = buildHtmlReport(data)
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST — gera e envia o e-mail (chamado pelo cron ou manualmente) ───────────
export async function POST() {
  try {
    const data = await buildWeeklyReportData()
    const html = buildHtmlReport(data)

    const hoje   = new Date()
    const semana = `${data.semanaInicio} a ${data.semanaFim}`
    const subject = `📋 Relatório Semanal Full7 — ${semana}`

    await sendWeeklyReport(html, subject)

    return NextResponse.json({
      success: true,
      message: `Relatório enviado com sucesso para a semana ${semana}`,
      stats: {
        atrasados:    data.atrasados.length,
        semana:       data.semana.length,
        proximaSemana: data.proximaSemana.length,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('[weekly-report] Erro ao enviar relatório:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
