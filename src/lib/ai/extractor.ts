import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedOrderData } from '@/types'

const client = new Anthropic({ apiKey: process.env.AI_API_KEY })
// Use AI_MODEL from env; fallback to claude-opus-4-5 (valid Anthropic model)
const model  = process.env.AI_MODEL ?? 'claude-opus-4-5'

const EXTRACTION_PROMPT = `Você é especialista em extrair dados de pedidos de uniformes esportivos da Full7.

Analise o PDF do pedido (sistema CommandPerfect/Full7), a imagem do layout e as observações do e-mail.

REGRAS CRÍTICAS:
1. Observações do e-mail têm PRIORIDADE MÁXIMA sobre o PDF
2. Urgência: se o e-mail mencionar "urgente/urgência alta/prioridade" → urgencia: true
3. Patch: se mencionar "patch/patch 3D/PET 3D" → patch_3d: true
4. Ribana: se mencionar "não usar ribana/sem ribana" → ribana: false
5. Para datas: use formato YYYY-MM-DD
6. Para número do pedido Full7: geralmente no formato F7AAAA/XXXXXX (ex: F72026/061332)
7. Se campo não encontrado: use null (nunca invente dados)

SEPARAÇÃO DE GRADES:
- Infantil: tamanhos 02, 04, 06, 08, 10, 12, 14, 16
- Adulto masculino/unisex: tamanhos PP, P, M, G, GG, XG, XGG, EXG, Es5
- Baby look feminino: mesmos tamanhos adulto mas para modelo feminino
- Shorts: grade separada (não conta no total de camisetas)

IDENTIFICAÇÃO DE CUSTOMIZAÇÃO:
- Sublimação total: preenche Sublimação em FRENTE e COSTA
- Silk: preenche Silk nas posições indicadas (não Sublimação)
- Patch 3D: preenche Patch em PEITO ESQ. (padrão)
- DTF: preenche DTF nas posições indicadas
- Posições possíveis: FRENTE, COSTA, PEITO ESQ., PEITO DIR., MANGA ESQ., MANGA DIR.

ALERTAS NAS OBSERVAÇÕES (adicionar automaticamente em MAIÚSCULAS):
- Gola Premium/Keeper/Modelo Antigo → "CONFIRMAR MODELAGEM ANTES DE CORTAR"
- Sem patch → "NÃO APLICAR PATCH NESTE PEDIDO"
- Dois tecidos → "SEPARAR CORTE POR TECIDO"
- Tamanho Es2/ES2 → "CONFIRMAR TAMANHO ES2 COM CLIENTE ANTES DE PRODUZIR"
- Arte não aprovada → "AGUARDAR ARTE VETORIZADA APROVADA PELO CLIENTE ANTES DA PRODUÇÃO"
- Dois tipos de meião → "NÃO MISTURAR [cor A] COM [cor B]"
- Poliamida → "CONFIRMAR DISPONIBILIDADE DO INSUMO POLIAMIDA"

Retorne APENAS JSON válido, sem texto adicional:
{
  "cliente": "string (MAIÚSCULAS)",
  "numero_pedido": "string (formato F7AAAA/XXXXXX ou como vier)",
  "data_pedido": "YYYY-MM-DD ou null",
  "data_entrega": "YYYY-MM-DD ou null",
  "despachar_ate": "YYYY-MM-DD ou null",
  "vendedor": "string ou null",
  "produto": "string (ex: CAMISETA, CONJUNTO, KIT) ou null",
  "modelo": "string (ex: DRY ESPORTIVA, REGATA, POLO) ou null",
  "tecido": "string (ex: DRY SPORT, POLIAMIDA, JACQUARD) ou null",
  "composicao": "string (ex: 100% POLIÉSTER) ou null",
  "gola": "string (ex: REDONDA, V, POLO, PADRE COM ZIPER, KEEPER, PREMIUM) ou null",
  "manga": "string (ex: CURTA, LONGA, SEM MANGA) ou null",
  "punho": "string ou null",
  "shorts": "SIM ou NÃO",
  "meiao": "string (ex: NÃO, SIM - 16 BRANCO + 1 PRETO) ou null",
  "patch_3d": boolean,
  "ribana": boolean,
  "quantidade_total": number (somente camisetas, SEM shorts e SEM meião),
  "valor_total": number ou null,
  "urgencia": boolean,
  "observacoes": "string com alertas e obs separados por \\n ou null",
  "grade": [
    {"tamanho": "PP", "quantidade": 5},
    {"tamanho": "04", "quantidade": 3}
  ],
  "ficha_dados": {
    "evento": "SIM ou NÃO",
    "ref_cor": "string (ex: AMARELO/VERDE) ou null",
    "customizacao": "string (ex: SUBLIMAÇÃO TOTAL, SILK PEITO, SUBLIMAÇÃO + PATCH 3D) ou null",
    "tecnicas": {
      "Silk":       ["FRENTE", "COSTA", "PEITO ESQ.", "PEITO DIR.", "MANGA ESQ.", "MANGA DIR."],
      "DTF":        [],
      "Patch":      [],
      "Sublimação": ["FRENTE", "COSTA"]
    },
    "grade_infantil": {"02":0,"04":0,"06":0,"08":0,"10":0,"12":0,"14":0,"16":0},
    "grade_adulto":   {"PP":0,"P":0,"M":0,"G":0,"GG":0,"XG":0,"XGG":0,"EXG":0,"Es5":0},
    "grade_baby":     {"PP":0,"P":0,"M":0,"G":0,"GG":0,"XG":0,"XGG":0,"EXG":0,"Es5":0},
    "shorts_inf":     {"02":0,"04":0,"06":0,"08":0,"10":0,"12":0,"14":0,"16":0},
    "shorts_adu":     {"PP":0,"P":0,"M":0,"G":0,"GG":0,"XG":0,"XGG":0,"EXG":0,"Es5":0}
  }
}

IMPORTANTE sobre tecnicas: inclua APENAS as posições com marcação real (lista não-vazia).
Exemplo correto para sublimação total: "Sublimação": ["FRENTE","COSTA"]
Exemplo correto sem silk: omita a chave "Silk" ou deixe [].`

export async function extractOrderData(params: {
  pdfText: string
  emailBody: string
  imageBase64?: string
}): Promise<ExtractedOrderData> {
  const { pdfText, emailBody, imageBase64 } = params

  const userContent: Anthropic.MessageParam['content'] = []

  if (imageBase64) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: imageBase64,
      },
    })
  }

  userContent.push({
    type: 'text',
    text: `=== DADOS DO PEDIDO (PDF CommandPerfect/Full7) ===
${pdfText}

=== OBSERVAÇÕES DO E-MAIL (PRIORIDADE MÁXIMA) ===
${emailBody || '(sem observações no e-mail)'}

Extraia todos os dados e retorne o JSON completo.`,
  })

  const response = await client.messages.create({
    model,
    max_tokens: 3000,
    system: EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('')

  // Extrair JSON da resposta
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`IA não retornou JSON válido: ${text.substring(0, 300)}`)
  }

  const parsed = JSON.parse(jsonMatch[0]) as ExtractedOrderData

  // Validações básicas
  if (!parsed.cliente)       throw new Error('Campo "cliente" não encontrado pelo extrator')
  if (!parsed.numero_pedido) throw new Error('Campo "numero_pedido" não encontrado pelo extrator')

  // Garantir que ficha_dados existe
  if (!parsed.ficha_dados) {
    parsed.ficha_dados = {
      evento: 'NÃO',
      tecnicas: { 'Sublimação': ['FRENTE', 'COSTA'] },
    }
  }
  if (!parsed.ficha_dados.tecnicas) {
    parsed.ficha_dados.tecnicas = { 'Sublimação': ['FRENTE', 'COSTA'] }
    if (parsed.patch_3d) parsed.ficha_dados.tecnicas['Patch'] = ['PEITO ESQ.']
  }

  return parsed
}
