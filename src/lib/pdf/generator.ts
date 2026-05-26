/**
 * Gerador da Ficha Técnica Full7 — versão oficial
 * Segue exatamente o template full7_mae aprovado pelo PCP.
 */
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import type { Order, FichaDados } from '@/types'

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const MM  = 2.8346          // 1 mm em pontos
const W   = 595.28          // A4 largura
const H   = 841.89          // A4 altura
const ML  = 8 * MM          // margem lateral
const FW  = W - 2 * ML     // largura útil ~549pt

// Paleta oficial Full7
const C = {
  laranja:  rgb(232/255, 119/255,  34/255),   // #E87722
  amarelo:  rgb(249/255, 228/255,   0/255),   // #f9e400
  cinzaL:   rgb(242/255, 242/255, 242/255),   // #f2f2f2
  cinzaB:   rgb(217/255, 217/255, 217/255),   // #d9d9d9
  preto:    rgb(0, 0, 0),
  branco:   rgb(1, 1, 1),
  vermelho: rgb(192/255,  57/255,  43/255),   // #c0392b
}
type Col = ReturnType<typeof rgb>

// Tamanhos de grade
const TAM_INF = ['02','04','06','08','10','12','14','16']
const TAM_ADU = ['PP','P','M','G','GG','XG','XGG','EXG','Es5']

// ── CONTEXTO DE DESENHO ───────────────────────────────────────────────────────
interface Ctx {
  p: PDFPage
  b: PDFFont  // HelveticaBold
  r: PDFFont  // Helvetica
  y: number   // cursor a partir do TOPO (cresce para baixo)
}

// Converte cursor (do topo) para y pdf-lib (da base)
const pY = (yTop: number, h = 0) => H - yTop - h

// ── PRIMITIVOS ────────────────────────────────────────────────────────────────
function rct(ctx: Ctx, x: number, y: number, w: number, h: number,
             fill: Col, stroke?: Col, sw = 0.5) {
  ctx.p.drawRectangle({
    x, y: pY(y, h), width: w, height: h,
    color: fill,
    ...(stroke ? { borderColor: stroke, borderWidth: sw } : {}),
  })
}

function tL(ctx: Ctx, t: string, x: number, y: number, h: number,
            font: PDFFont, size: number, color: Col = C.preto) {
  if (!t?.trim()) return
  ctx.p.drawText(t, {
    x: x + 1.5 * MM,
    y: pY(y, h) + (h - size) / 2 + size * 0.22,
    font, size, color,
  })
}

function tC(ctx: Ctx, t: string, x: number, y: number, w: number, h: number,
            font: PDFFont, size: number, color: Col = C.preto) {
  if (!t?.trim()) return
  const tw = font.widthOfTextAtSize(t, size)
  ctx.p.drawText(t, {
    x: x + (w - tw) / 2,
    y: pY(y, h) + (h - size) / 2 + size * 0.22,
    font, size, color,
  })
}

function tR(ctx: Ctx, t: string, x: number, y: number, w: number, h: number,
            font: PDFFont, size: number, color: Col = C.preto) {
  if (!t?.trim()) return
  const tw = font.widthOfTextAtSize(t, size)
  ctx.p.drawText(t, {
    x: x + w - tw - 1.5 * MM,
    y: pY(y, h) + (h - size) / 2 + size * 0.22,
    font, size, color,
  })
}

function sec(ctx: Ctx, title: string, x = ML, w = FW, h = 5 * MM) {
  rct(ctx, x, ctx.y, w, h, C.laranja)
  tL(ctx, title, x, ctx.y, h, ctx.b, 8, C.branco)
  ctx.y += h
}

function dualCell(ctx: Ctx, label: string, value: string,
                  x: number, lw: number, vw: number, h = 6.5 * MM) {
  rct(ctx, x, ctx.y, lw, h, C.cinzaL, C.cinzaB, 0.5)
  tL(ctx, label, x, ctx.y, h, ctx.b, 7)
  rct(ctx, x + lw, ctx.y, vw, h, C.branco, C.cinzaB, 0.5)
  tL(ctx, value ?? '', x + lw, ctx.y, h, ctx.r, 8)
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = iso.split('T')[0].split('-')
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso
}

function todayStr(): string {
  return fmtDate(new Date().toISOString().split('T')[0])
}

function gradeFromSizes(sizes: Order['order_sizes'], keys: string[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const k of keys) result[k] = sizes?.find(s => s.tamanho === k)?.quantidade ?? 0
  return result
}

function sumGrade(g: Record<string, number>): number {
  return Object.values(g).reduce((a, b) => a + b, 0)
}

// Sub-tabela de grade (infantil ou adulto)
function drawGradeBlock(
  ctx: Ctx,
  sizes: string[],
  rows: Array<{ label: string; grade: Record<string, number> }>,
  gradeLW: number,
  totW: number,
  grH: number,
) {
  if (rows.every(row => sumGrade(row.grade) === 0)) return

  const eachW = (FW - gradeLW - totW) / sizes.length

  // Header
  let cx = ML
  rct(ctx, cx, ctx.y, gradeLW, grH, C.cinzaL, C.cinzaB, 0.5)
  cx += gradeLW
  for (const s of sizes) {
    rct(ctx, cx, ctx.y, eachW, grH, C.cinzaL, C.cinzaB, 0.5)
    tC(ctx, s, cx, ctx.y, eachW, grH, ctx.b, s.length > 2 ? 6 : 8)
    cx += eachW
  }
  rct(ctx, cx, ctx.y, totW, grH, C.cinzaL, C.cinzaB, 0.5)
  tC(ctx, 'TOTAL', cx, ctx.y, totW, grH, ctx.b, 8)
  ctx.y += grH

  // Linhas de dados
  for (const row of rows) {
    if (sumGrade(row.grade) === 0) continue
    cx = ML
    rct(ctx, cx, ctx.y, gradeLW, grH, C.cinzaL, C.cinzaB, 0.5)
    tL(ctx, row.label, cx, ctx.y, grH, ctx.r, 8)
    cx += gradeLW
    for (const s of sizes) {
      rct(ctx, cx, ctx.y, eachW, grH, C.branco, C.cinzaB, 0.5)
      const q = row.grade[s] ?? 0
      if (q > 0) tC(ctx, String(q), cx, ctx.y, eachW, grH, ctx.r, 8)
      cx += eachW
    }
    const total = sumGrade(row.grade)
    rct(ctx, cx, ctx.y, totW, grH, C.cinzaL, C.cinzaB, 0.5)
    tC(ctx, String(total), cx, ctx.y, totW, grH, ctx.b, 8)
    ctx.y += grH
  }
}

// ── FUNÇÃO PRINCIPAL ──────────────────────────────────────────────────────────
export async function generateOpPdf(
  order: Order,
  imageBuffer?: Buffer,
): Promise<Uint8Array> {

  const doc  = await PDFDocument.create()
  const page = doc.addPage([W, H])
  const b    = await doc.embedFont(StandardFonts.HelveticaBold)
  const r    = await doc.embedFont(StandardFonts.Helvetica)
  const ctx: Ctx = { p: page, b, r, y: 0 }

  const fd: FichaDados = (order.ficha_dados as FichaDados) ?? {}
  const sizes = order.order_sizes ?? []

  const gradeInf  = fd.grade_infantil ?? gradeFromSizes(sizes, TAM_INF)
  const gradeAdu  = fd.grade_adulto   ?? gradeFromSizes(sizes, TAM_ADU)
  const gradeBaby = fd.grade_baby     ?? {}
  const shortsInf = fd.shorts_inf     ?? {}
  const shortsAdu = fd.shorts_adu     ?? {}

  const tecnicas: Record<string, string[]> = fd.tecnicas ?? {
    'Sublimação': ['FRENTE', 'COSTA'],
    ...(order.patch_3d ? { 'Patch': ['PEITO ESQ.'] } : {}),
  }

  type ObsLine = { bold: boolean; color: Col; text: string }
  const obsLines: ObsLine[] = []
  if (order.urgencia) {
    obsLines.push({ bold: true, color: C.vermelho, text: 'PEDIDO URGENTE — PRIORIZAR PRODUÇÃO' })
  }
  if (order.observacoes) {
    for (const line of order.observacoes.split(/[\n;]/).filter(l => l.trim())) {
      const isAlert = /aguardar|confirmar|não aplic|separar|atenção|urgente|não mistu/i.test(line)
      obsLines.push({ bold: true, color: isAlert ? C.vermelho : C.preto, text: line.trim().toUpperCase() })
    }
  }
  obsLines.push({ bold: true, color: C.laranja, text: '----- SEGUIR GRADE FULL 7 ------' })

  // ── BLOCO 1: HEADER ────────────────────────────────────────────────────────
  const hdrH = 10 * MM
  rct(ctx, ML, ctx.y, FW, hdrH, C.laranja)
  tL(ctx, 'Full 7', ML, ctx.y, hdrH, b, 18, C.branco)
  tC(ctx, 'FICHA TÉCNICA', ML, ctx.y, FW, hdrH, b, 13, C.branco)
  tR(ctx, `DATA: ${fmtDate(order.data_pedido) || todayStr()}`, ML, ctx.y, FW, hdrH, r, 8, C.branco)
  ctx.y += hdrH

  const lw1  = 22 * MM
  const c1W  = FW * 0.60
  const c2W  = FW * 0.40
  const r1h  =  6 * MM

  dualCell(ctx, 'CLIENTE:', (order.cliente ?? '').toUpperCase(), ML, lw1, c1W - lw1, r1h)
  rct(ctx, ML + c1W, ctx.y, lw1, r1h, C.cinzaL, C.cinzaB, 0.5)
  tL(ctx, 'DATA ENTREGA:', ML + c1W, ctx.y, r1h, b, 7)
  rct(ctx, ML + c1W + lw1, ctx.y, c2W - lw1, r1h, C.branco, C.cinzaB, 0.5)
  tL(ctx, fmtDate(order.data_entrega), ML + c1W + lw1, ctx.y, r1h, r, 8)
  ctx.y += r1h

  dualCell(ctx, 'Nº PEDIDO:', order.numero_pedido ?? '', ML, lw1, c1W - lw1, r1h)
  rct(ctx, ML + c1W, ctx.y, lw1, r1h, C.cinzaL, C.cinzaB, 0.5)
  tL(ctx, 'VENDEDOR:', ML + c1W, ctx.y, r1h, b, 7)
  rct(ctx, ML + c1W + lw1, ctx.y, c2W - lw1, r1h, C.branco, C.cinzaB, 0.5)
  tL(ctx, (order.vendedor ?? '').toUpperCase(), ML + c1W + lw1, ctx.y, r1h, r, 8)
  ctx.y += r1h

  const r3h  = 14 * MM
  const refW = FW * 0.20
  const dspW = FW * 0.50
  const evtW = FW - refW - dspW

  rct(ctx, ML, ctx.y, refW * 0.40, r3h, C.cinzaL, C.cinzaB, 0.5)
  tL(ctx, 'REF.', ML, ctx.y, r3h, b, 7)
  rct(ctx, ML + refW * 0.40, ctx.y, refW * 0.60, r3h, C.branco, C.cinzaB, 0.5)
  tL(ctx, (fd.ref_cor ?? '').toUpperCase(), ML + refW * 0.40, ctx.y, r3h, r, 7)

  const dspX = ML + refW
  rct(ctx, dspX, ctx.y, dspW, r3h, C.laranja, C.cinzaB, 0.5)
  tC(ctx, 'DESPACHAR ATÉ:', dspX, ctx.y, dspW, 5.5 * MM, b, 8, C.branco)
  tC(ctx, fmtDate(order.despachar_ate) || '—', dspX, ctx.y + 5.5 * MM, dspW, r3h - 5.5 * MM, b, 16, C.branco)

  const evtX = dspX + dspW
  rct(ctx, evtX, ctx.y, evtW * 0.48, r3h, C.cinzaL, C.cinzaB, 0.5)
  tL(ctx, 'EVENTO:', evtX, ctx.y, r3h, b, 7)
  rct(ctx, evtX + evtW * 0.48, ctx.y, evtW * 0.52, r3h, C.branco, C.cinzaB, 0.5)
  tC(ctx, fd.evento ?? 'NÃO', evtX + evtW * 0.48, ctx.y, evtW * 0.52, r3h, b, 14)
  ctx.y += r3h

  // ── BLOCO 2: PRODUTO ────────────────────────────────────────────────────────
  sec(ctx, 'PRODUTO:')
  const plw  = 26 * MM
  const half = FW / 2

  const prodRows = [
    { l: 'MODELO',      v: order.modelo?.toUpperCase() ?? '',
      l2: 'GOLA',       v2: order.gola?.toUpperCase() ?? '' },
    { l: 'MATERIAL',    v: order.tecido?.toUpperCase() ?? '',
      l2: 'SHORTS',     v2: order.shorts?.toUpperCase() ?? (sumGrade(shortsAdu) + sumGrade(shortsInf) > 0 ? 'SIM' : 'NÃO') },
    { l: 'COMPOSIÇÃO',  v: order.composicao?.toUpperCase() ?? '',
      l2: 'MEIÃO',      v2: order.meiao?.toUpperCase() ?? 'NÃO' },
    { l: 'REF. DE COR', v: (fd.ref_cor ?? '').toUpperCase(),
      l2: 'CUSTOM.',    v2: (fd.customizacao ?? (order.patch_3d ? 'SUBLIMAÇÃO + PATCH 3D' : 'SUBLIMAÇÃO TOTAL')).toUpperCase() },
  ]
  for (const row of prodRows) {
    dualCell(ctx, row.l, row.v, ML, plw, half - plw)
    dualCell(ctx, row.l2, row.v2, ML + half, plw, half - plw)
    ctx.y += 6.5 * MM
  }

  // ── BLOCO 3: LAYOUT ────────────────────────────────────────────────────────
  sec(ctx, 'LAYOUT:')
  const layoutH = 54 * MM
  rct(ctx, ML, ctx.y, FW, layoutH, C.branco, C.cinzaB, 0.5)

  if (imageBuffer) {
    try {
      let img
      try { img = await doc.embedPng(imageBuffer) }
      catch { img = await doc.embedJpg(imageBuffer) }
      const pad   = 4 * MM
      const maxW  = FW - 2 * pad
      const maxH  = layoutH - 2 * pad
      const scale = Math.min(maxW / img.width, maxH / img.height)
      const dw    = img.width * scale
      const dh    = img.height * scale
      page.drawImage(img, {
        x: ML + (FW - dw) / 2,
        y: pY(ctx.y, layoutH) + (layoutH - dh) / 2,
        width: dw, height: dh,
      })
    } catch {
      tC(ctx, '[IMAGEM NÃO DISPONÍVEL]', ML, ctx.y, FW, layoutH, r, 9, C.cinzaB)
    }
  } else {
    tC(ctx, '[SEM IMAGEM DE LAYOUT]', ML, ctx.y, FW, layoutH, r, 9, C.cinzaB)
  }
  ctx.y += layoutH

  // ── BLOCO 4: CUSTAMIZAÇÃO ──────────────────────────────────────────────────
  sec(ctx, 'CUSTAMIZAÇÃO:')
  const cPositions = ['FRENTE','COSTA','PEITO ESQ.','PEITO DIR.','MANGA ESQ.','MANGA DIR.']
  const techW = 30 * MM
  const posW  = (FW - techW) / cPositions.length
  const chH   =  8 * MM

  let cx = ML
  rct(ctx, cx, ctx.y, techW, chH, C.cinzaL, C.cinzaB, 0.5)
  tC(ctx, 'TÉCNICA APLICADA', cx, ctx.y, techW, chH, b, 7)
  cx += techW
  for (const lbl of cPositions) {
    rct(ctx, cx, ctx.y, posW, chH, C.cinzaL, C.cinzaB, 0.5)
    tC(ctx, lbl, cx, ctx.y, posW, chH, b, 6.5)
    cx += posW
  }
  ctx.y += chH

  const crH   = 5 * MM
  for (const rowName of ['Silk','DTF','Patch','Sublimação']) {
    cx = ML
    rct(ctx, cx, ctx.y, techW, crH, C.cinzaL, C.cinzaB, 0.5)
    tL(ctx, rowName, cx, ctx.y, crH, r, 8)
    cx += techW
    for (const pos of cPositions) {
      rct(ctx, cx, ctx.y, posW, crH, C.branco, C.cinzaB, 0.5)
      if (tecnicas[rowName]?.includes(pos)) tC(ctx, 'X', cx, ctx.y, posW, crH, b, 9)
      cx += posW
    }
    ctx.y += crH
  }

  // ── BLOCO 5: GRADE ─────────────────────────────────────────────────────────
  sec(ctx, 'GRADE:')
  const gradeLW = 28 * MM
  const totW    = 16 * MM
  const grH     =  6 * MM

  drawGradeBlock(ctx, TAM_INF, [
    { label: 'INFANTIL', grade: gradeInf },
    { label: 'SHORTS',   grade: shortsInf },
  ], gradeLW, totW, grH)

  drawGradeBlock(ctx, TAM_ADU, [
    { label: 'MASCULINO', grade: gradeAdu  },
    { label: 'FEMININA',  grade: gradeBaby },
    { label: 'SHORTS',    grade: shortsAdu },
  ], gradeLW, totW, grH)

  const totGH = 7 * MM
  const totGW = 56 * MM
  const totGX = ML + FW - totGW
  rct(ctx, totGX, ctx.y, totGW / 2, totGH, C.cinzaL, C.cinzaB, 0.5)
  tC(ctx, 'TOTAL GERAL', totGX, ctx.y, totGW / 2, totGH, b, 8)
  rct(ctx, totGX + totGW / 2, ctx.y, totGW / 2, totGH, C.amarelo, C.cinzaB, 0.5)
  tC(ctx, String(order.quantidade_total ?? 0), totGX + totGW / 2, ctx.y, totGW / 2, totGH, b, 10)
  ctx.y += totGH

  // ── BLOCO 6: OBSERVAÇÕES GERAIS ────────────────────────────────────────────
  sec(ctx, 'OBSERVAÇÕES GERAIS:')
  const obsLineH = 5 * MM
  const obsH     = Math.max(14 * MM, obsLines.length * obsLineH + 4 * MM)
  rct(ctx, ML, ctx.y, FW, obsH, C.branco, C.cinzaB, 0.5)

  let obsY = ctx.y + 2 * MM
  for (const line of obsLines) {
    const font = line.bold ? b : r
    const tw   = font.widthOfTextAtSize(line.text, 8)
    page.drawText(line.text, {
      x: ML + (FW - tw) / 2,
      y: pY(obsY, obsLineH) + (obsLineH - 8) / 2 + 8 * 0.22,
      font, size: 8, color: line.color,
    })
    obsY += obsLineH
  }
  ctx.y += obsH + 3 * MM

  // ── BLOCO 7: ASSINATURAS ───────────────────────────────────────────────────
  const sigH = 10 * MM
  for (const label of ['RESPONSÁVEL PCP', 'APROVAÇÃO ARTE / CLIENTE', 'VENDEDOR']) {
    const lineY = pY(ctx.y, sigH) + sigH * 0.55
    page.drawLine({
      start: { x: ML + 10 * MM, y: lineY },
      end:   { x: ML + FW - 10 * MM, y: lineY },
      thickness: 0.5, color: C.cinzaB,
    })
    tC(ctx, label, ML, ctx.y + 5.5 * MM, FW, sigH - 5.5 * MM, r, 7, C.cinzaB)
    ctx.y += sigH
  }

  // ── BLOCO 8: RODAPÉ (fixo na base) ────────────────────────────────────────
  const footH = 6 * MM
  page.drawRectangle({ x: 0, y: 0, width: W, height: footH, color: C.laranja })
  page.drawText(
    'FULL7 INDÚSTRIA E COMÉRCIO LTDA  |  Maringá - PR  |  (44) 9 9974-4988  |  @use.full7',
    { x: ML, y: footH * 0.28, font: r, size: 6.5, color: C.branco }
  )
  const rightTxt = `Ficha gerada em ${todayStr()}  |  Pedido: ${order.numero_pedido ?? '—'}`
  const rtw = r.widthOfTextAtSize(rightTxt, 6.5)
  page.drawText(rightTxt, {
    x: W - ML - rtw, y: footH * 0.28, font: r, size: 6.5, color: C.branco,
  })

  return doc.save()
}
