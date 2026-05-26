/**
 * Extração básica SEM IA — usa regex no assunto e corpo do e-mail.
 * Ativado automaticamente quando a API Claude não está disponível.
 */
import type { ExtractedOrderData } from '@/types'

export function extractOrderDataFallback(params: {
  emailSubject: string
  emailBody: string
  emailFrom: string
}): ExtractedOrderData {
  const { emailSubject, emailBody, emailFrom } = params
  const fullText = `${emailSubject}\n${emailBody}`

  // ── Número do pedido ──────────────────────────────────────────
  // Tenta capturar padrões como: "Pedido 4587", "OP 4587", "Nº 4587"
  const numPedidoMatch =
    fullText.match(/pedido[:\s#]*(\d{3,6})/i) ??
    fullText.match(/\bOP[:\s#-]*(\d{3,6})\b/i) ??
    fullText.match(/n[ºo°][:\s]*(\d{3,6})/i) ??
    emailSubject.match(/(\d{3,6})/)

  const numero_pedido = numPedidoMatch
    ? numPedidoMatch[1]
    : `EMAIL-${Date.now()}`

  // ── Cliente ───────────────────────────────────────────────────
  const clienteMatch =
    fullText.match(/cliente[:\s]+([^\n\r,]+)/i) ??
    emailSubject.match(/(?:OP\s*-\s*[^-]+-\s*)(.+)/i) ??
    emailSubject.match(/(?:pedido\s+\d+\s*-\s*)(.+)/i)

  const cliente = clienteMatch
    ? clienteMatch[1].trim()
    : emailFrom.replace(/<[^>]+>/, '').trim() || 'Não identificado'

  // ── Urgência ──────────────────────────────────────────────────
  const urgencia = /urg[eê]nte|urgência\s*alta|prioridade\s*máxima/i.test(fullText)

  // ── Observações ───────────────────────────────────────────────
  const obsMatch = fullText.match(/observa[çc][õo]es?[:\s]*\n?([\s\S]{10,300})/i)
  const observacoes = obsMatch
    ? obsMatch[1].trim().substring(0, 500)
    : `E-mail recebido de ${emailFrom}. Dados incompletos — preencher manualmente.`

  // ── Datas ────────────────────────────────────────────────────
  // Formato dd/mm/yyyy
  const dates: string[] = Array.from(
    fullText.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g),
    ([, d, mo, y]) => `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  )

  const data_entrega = dates[0] ?? null

  return {
    cliente,
    numero_pedido,
    data_pedido:   null,
    data_entrega,
    despachar_ate: null,
    vendedor:      null,
    produto:       null,
    modelo:        null,
    tecido:        null,
    composicao:    null,
    gola:          null,
    manga:         null,
    punho:         null,
    shorts:        null,
    meiao:         null,
    patch_3d:      false,
    ribana:        true,
    quantidade_total: 0,
    valor_total:   null,
    urgencia,
    observacoes,
    grade:         [],
    ficha_dados: {
      evento:       'NÃO',
      ref_cor:      undefined,
      customizacao: 'SUBLIMAÇÃO TOTAL',
      tecnicas:     { 'Sublimação': ['FRENTE', 'COSTA'] },
      grade_infantil: { '02':0,'04':0,'06':0,'08':0,'10':0,'12':0,'14':0,'16':0 },
      grade_adulto:   { 'PP':0,'P':0,'M':0,'G':0,'GG':0,'XG':0,'XGG':0,'EXG':0,'Es5':0 },
      grade_baby:     {},
      shorts_inf:     {},
      shorts_adu:     {},
    },
  }
}
