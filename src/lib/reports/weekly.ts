/**
 * Gerador do relatório semanal de entregas Full7.
 * Enviado toda segunda-feira às 8h.
 */
import { google } from 'googleapis'
import { getOrders } from '@/lib/supabase/client'
import type { Order } from '@/types'
import { ORDER_STATUS_LABELS } from '@/types'

// ── Helpers de data ───────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()                         // 0=dom, 1=seg...
  const diff = day === 0 ? -6 : 1 - day          // recua até segunda
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(start: Date): Date {
  const d = new Date(start)
  d.setDate(d.getDate() + 6)                     // domingo
  d.setHours(23, 59, 59, 999)
  return d
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function diasRestantes(iso: string | null | undefined): number | null {
  if (!iso) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const dt   = new Date(iso + 'T00:00:00')
  return Math.round((dt.getTime() - hoje.getTime()) / 86400000)
}

// ── Geração do HTML do relatório ──────────────────────────────────────────────
export interface WeeklyReportData {
  semanaInicio: string
  semanaFim:    string
  atrasados:    Order[]
  semana:       Order[]
  proximaSemana: Order[]
}

export async function buildWeeklyReportData(): Promise<WeeklyReportData> {
  const hoje   = new Date()
  const inicio = startOfWeek(hoje)
  const fim    = endOfWeek(inicio)

  // Próxima semana
  const proxInicio = new Date(inicio); proxInicio.setDate(proxInicio.getDate() + 7)
  const proxFim    = endOfWeek(proxInicio)

  const [atrasados, semana, proximaSemana] = await Promise.all([
    getOrders({ status: 'atrasado' }),
    // Entregas desta semana (todos os status exceto entregue)
    (async () => {
      const todos = await getOrders({})
      return todos.filter(o =>
        o.data_entrega &&
        o.data_entrega >= isoDate(inicio) &&
        o.data_entrega <= isoDate(fim) &&
        !['entregue', 'erro'].includes(o.status)
      )
    })(),
    // Entregas da próxima semana
    (async () => {
      const todos = await getOrders({})
      return todos.filter(o =>
        o.data_entrega &&
        o.data_entrega >= isoDate(proxInicio) &&
        o.data_entrega <= isoDate(proxFim) &&
        !['entregue', 'erro'].includes(o.status)
      )
    })(),
  ])

  return {
    semanaInicio: fmtDate(isoDate(inicio)),
    semanaFim:    fmtDate(isoDate(fim)),
    atrasados,
    semana:       semana.sort((a, b) => (a.data_entrega ?? '') < (b.data_entrega ?? '') ? -1 : 1),
    proximaSemana: proximaSemana.sort((a, b) => (a.data_entrega ?? '') < (b.data_entrega ?? '') ? -1 : 1),
  }
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    recebido:    '#64748b',
    op_gerada:   '#3b82f6',
    em_producao: '#6366f1',
    sublimacao:  '#8b5cf6',
    corte:       '#f97316',
    costura:     '#f59e0b',
    conferencia: '#eab308',
    pronto:      '#22c55e',
    atrasado:    '#ef4444',
    incompleto:  '#f59e0b',
    erro:        '#f43f5e',
  }
  const color = colors[status] ?? '#64748b'
  const label = ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status
  return `<span style="background:${color}20;color:${color};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">${label}</span>`
}

function orderRow(o: Order, showDias = false): string {
  const dias = diasRestantes(o.data_entrega)
  let diasLabel = ''
  if (showDias && dias !== null) {
    if (dias < 0)     diasLabel = `<span style="color:#ef4444;font-weight:700"> (${Math.abs(dias)}d atraso)</span>`
    else if (dias === 0) diasLabel = `<span style="color:#ef4444;font-weight:700"> (HOJE)</span>`
    else if (dias <= 3)  diasLabel = `<span style="color:#f97316;font-weight:600"> (${dias}d)</span>`
  }
  const valor = o.valor_total
    ? o.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—'

  return `
  <tr style="border-bottom:1px solid #f1f5f9">
    <td style="padding:10px 12px;font-family:monospace;font-weight:600;color:#E87722">#${o.numero_pedido}</td>
    <td style="padding:10px 12px;font-weight:500;color:#1e293b">${o.cliente}${o.urgencia ? ' <span style="color:#ef4444">🔴</span>' : ''}</td>
    <td style="padding:10px 12px;color:#475569">${fmtDate(o.data_entrega)}${diasLabel}</td>
    <td style="padding:10px 12px;text-align:right;color:#475569">${o.quantidade_total || '—'}</td>
    <td style="padding:10px 12px;text-align:right;color:#475569">${valor}</td>
    <td style="padding:10px 12px;text-align:center">${statusBadge(o.status)}</td>
  </tr>`
}

function ordersTable(orders: Order[], showDias = false): string {
  if (orders.length === 0) {
    return `<p style="color:#94a3b8;font-style:italic;padding:12px 0">Nenhum pedido</p>`
  }
  const totalPecas = orders.reduce((s, o) => s + (o.quantidade_total || 0), 0)
  const totalValor = orders.reduce((s, o) => s + (o.valor_total || 0), 0)

  return `
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
        <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600">Pedido</th>
        <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600">Cliente</th>
        <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600">Entrega</th>
        <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">Peças</th>
        <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">Valor</th>
        <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600">Status</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map(o => orderRow(o, showDias)).join('')}
    </tbody>
    <tfoot>
      <tr style="background:#f8fafc;border-top:2px solid #e2e8f0;font-weight:600">
        <td colspan="3" style="padding:8px 12px;color:#475569">Total</td>
        <td style="padding:8px 12px;text-align:right;color:#1e293b">${totalPecas} peças</td>
        <td style="padding:8px 12px;text-align:right;color:#1e293b">
          ${totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </td>
        <td></td>
      </tr>
    </tfoot>
  </table>`
}

export function buildHtmlReport(data: WeeklyReportData): string {
  const { semanaInicio, semanaFim, atrasados, semana, proximaSemana } = data
  const totalPecasSemana = semana.reduce((s, o) => s + (o.quantidade_total || 0), 0)
  const totalValorSemana = semana.reduce((s, o) => s + (o.valor_total || 0), 0)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:24px">
<div style="max-width:780px;margin:0 auto">

  <!-- HEADER -->
  <div style="background:#E87722;border-radius:12px 12px 0 0;padding:24px 28px">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="background:rgba(255,255,255,0.2);border-radius:8px;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-weight:900;font-size:16px">F7</span>
      </div>
      <div>
        <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px">FULL7 UNIFORMES ESPORTIVOS</p>
        <h1 style="margin:2px 0 0;color:white;font-size:20px;font-weight:700">
          📋 Relatório Semanal de Produção
        </h1>
      </div>
    </div>
    <p style="margin:12px 0 0;color:rgba(255,255,255,0.85);font-size:14px">
      Semana de <strong>${semanaInicio}</strong> a <strong>${semanaFim}</strong>
    </p>
  </div>

  <!-- RESUMO -->
  <div style="background:white;padding:20px 28px;display:flex;gap:16px;border-bottom:1px solid #e2e8f0">
    ${atrasados.length > 0 ? `
    <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626">${atrasados.length}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#ef4444;font-weight:600">ATRASADOS</p>
    </div>` : ''}
    <div style="flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:700;color:#2563eb">${semana.length}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#3b82f6;font-weight:600">ENTREGAS ESTA SEMANA</p>
    </div>
    <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a">${totalPecasSemana}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#22c55e;font-weight:600">PEÇAS A ENTREGAR</p>
    </div>
    <div style="flex:1;background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px;text-align:center">
      <p style="margin:0;font-size:22px;font-weight:700;color:#ca8a04">
        ${totalValorSemana.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#eab308;font-weight:600">VALOR A FATURAR</p>
    </div>
  </div>

  <!-- CORPO -->
  <div style="background:white;padding:24px 28px;border-radius:0 0 12px 12px">

    ${atrasados.length > 0 ? `
    <!-- ATRASADOS -->
    <div style="background:#fff5f5;border-left:4px solid #ef4444;border-radius:4px;padding:12px 16px;margin-bottom:24px">
      <p style="margin:0;font-size:14px;font-weight:700;color:#dc2626">
        ⚠️ ${atrasados.length} pedido(s) com entrega atrasada — ação imediata necessária
      </p>
    </div>
    <h2 style="margin:0 0 12px;font-size:15px;color:#dc2626;font-weight:700">
      Pedidos Atrasados (${atrasados.length})
    </h2>
    ${ordersTable(atrasados, true)}
    <div style="margin-bottom:28px"></div>` : ''}

    <!-- ESTA SEMANA -->
    <h2 style="margin:0 0 12px;font-size:15px;color:#1e293b;font-weight:700;border-bottom:2px solid #E87722;padding-bottom:8px">
      📅 Entregas desta semana — ${semanaInicio} a ${semanaFim} (${semana.length} pedidos)
    </h2>
    ${ordersTable(semana, true)}

    ${proximaSemana.length > 0 ? `
    <div style="margin-top:28px"></div>
    <h2 style="margin:0 0 12px;font-size:15px;color:#1e293b;font-weight:700;border-bottom:2px solid #94a3b8;padding-bottom:8px">
      📆 Próxima semana — ${proximaSemana.length} pedidos já mapeados
    </h2>
    ${ordersTable(proximaSemana)}` : ''}

  </div>

  <!-- FOOTER -->
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">
    Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')} •
    Full7 Indústria e Comércio Ltda • Maringá - PR
  </p>

</div>
</body>
</html>`
}

// ── Envio via Gmail API ───────────────────────────────────────────────────────
export async function sendWeeklyReport(htmlBody: string, subject: string): Promise<void> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const to   = process.env.GMAIL_EMAIL!
  const from = process.env.GMAIL_EMAIL!

  // Monta mensagem RFC 2822 em base64url
  const message = [
    `From: Full7 Sistema <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ].join('\r\n')

  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  })
}
