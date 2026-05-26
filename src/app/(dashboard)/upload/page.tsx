'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Image, CheckCircle, AlertTriangle, X, Plus, Loader2 } from 'lucide-react'

interface UploadItem {
  id: string
  pdf:       File | null
  imagem:    File | null
  observacoes: string
  status:    'aguardando' | 'processando' | 'sucesso' | 'erro'
  mensagem:  string
  orderId?:  string
}

function newItem(): UploadItem {
  return {
    id:          Math.random().toString(36).slice(2),
    pdf:         null,
    imagem:      null,
    observacoes: '',
    status:      'aguardando',
    mensagem:    '',
  }
}

export default function UploadPage() {
  const router = useRouter()
  const [items, setItems] = useState<UploadItem[]>([newItem()])
  const [processando, setProcessando] = useState(false)

  function update(id: string, patch: Partial<UploadItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  function addItem() {
    setItems(prev => [...prev, newItem()])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function processarTodos() {
    const pendentes = items.filter(it => it.pdf && it.status === 'aguardando')
    if (pendentes.length === 0) return

    setProcessando(true)

    for (const item of pendentes) {
      update(item.id, { status: 'processando', mensagem: 'Processando...' })

      try {
        const form = new FormData()
        form.append('pdf', item.pdf!)
        if (item.imagem) form.append('imagem', item.imagem)
        if (item.observacoes) form.append('observacoes', item.observacoes)

        const res  = await fetch('/api/orders/upload', { method: 'POST', body: form })
        const data = await res.json()

        if (data.success) {
          update(item.id, {
            status:   'sucesso',
            mensagem: `Pedido criado com sucesso!`,
            orderId:  data.orderId,
          })
        } else {
          update(item.id, {
            status:   'erro',
            mensagem: data.error ?? 'Erro desconhecido',
          })
        }
      } catch (e) {
        update(item.id, {
          status:   'erro',
          mensagem: e instanceof Error ? e.message : String(e),
        })
      }
    }

    setProcessando(false)
  }

  const prontos  = items.filter(it => it.status === 'sucesso').length
  const erros    = items.filter(it => it.status === 'erro').length
  const pendentes = items.filter(it => it.pdf && it.status === 'aguardando').length

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upload de Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Processe pedidos existentes sem precisar enviar e-mail
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={addItem}
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={processando}
          >
            <Plus size={14} />
            Adicionar pedido
          </button>
          <button
            onClick={processarTodos}
            disabled={processando || pendentes === 0}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processando
              ? <><Loader2 size={14} className="animate-spin" /> Processando...</>
              : <><Upload size={14} /> Processar {pendentes > 0 ? `${pendentes} pedido(s)` : 'tudo'}</>
            }
          </button>
        </div>
      </div>

      {/* Resumo */}
      {(prontos > 0 || erros > 0) && (
        <div className="flex gap-3">
          {prontos > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
              <CheckCircle size={12} /> {prontos} processado(s) com sucesso
            </span>
          )}
          {erros > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
              <AlertTriangle size={12} /> {erros} com erro
            </span>
          )}
        </div>
      )}

      {/* Cards de upload */}
      <div className="space-y-4">
        {items.map((item, idx) => (
          <UploadCard
            key={item.id}
            item={item}
            index={idx + 1}
            disabled={processando}
            onUpdate={(patch) => update(item.id, patch)}
            onRemove={() => removeItem(item.id)}
            onVerPedido={() => item.orderId && router.push(`/pedidos/${item.orderId}`)}
          />
        ))}
      </div>

      {/* Botão adicionar (atalho no fim) */}
      <button
        onClick={addItem}
        disabled={processando}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-full7-300 hover:text-full7-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Adicionar mais um pedido
      </button>
    </div>
  )
}

// ── Card individual de upload ──────────────────────────────────────────────────
interface CardProps {
  item: UploadItem
  index: number
  disabled: boolean
  onUpdate: (patch: Partial<UploadItem>) => void
  onRemove: () => void
  onVerPedido: () => void
}

function UploadCard({ item, index, disabled, onUpdate, onRemove, onVerPedido }: CardProps) {
  const pdfRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((e: React.DragEvent, type: 'pdf' | 'imagem') => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (type === 'pdf'    && file.type === 'application/pdf') onUpdate({ pdf: file })
    if (type === 'imagem' && file.type.startsWith('image/'))  onUpdate({ imagem: file })
  }, [onUpdate])

  const statusColor = {
    aguardando:  'border-gray-200',
    processando: 'border-full7-300 bg-full7-50/30',
    sucesso:     'border-green-300 bg-green-50/30',
    erro:        'border-red-300 bg-red-50/30',
  }[item.status]

  return (
    <div className={`card border-2 ${statusColor} transition-colors`}>
      <div className="p-4 space-y-4">
        {/* Título + status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Pedido #{index}
            {item.pdf && <span className="ml-2 text-gray-400 font-normal">— {item.pdf.name}</span>}
          </span>
          <div className="flex items-center gap-2">
            {item.status === 'processando' && (
              <span className="flex items-center gap-1 text-xs text-full7-600">
                <Loader2 size={12} className="animate-spin" /> Processando...
              </span>
            )}
            {item.status === 'sucesso' && (
              <button onClick={onVerPedido} className="text-xs text-green-700 underline">
                Ver pedido →
              </button>
            )}
            {item.status !== 'processando' && (
              <button onClick={onRemove} disabled={disabled}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Área de drop */}
        <div className="grid grid-cols-2 gap-3">
          {/* PDF */}
          <div
            onDrop={(e) => onDrop(e, 'pdf')}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !disabled && pdfRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
              ${item.pdf ? 'border-full7-400 bg-full7-50' : 'border-gray-200 hover:border-full7-300'}`}
          >
            <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpdate({ pdf: e.target.files[0] })} />
            {item.pdf ? (
              <>
                <FileText size={20} className="text-full7-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-full7-700 truncate">{item.pdf.name}</p>
                <p className="text-xs text-full7-500">{(item.pdf.size / 1024).toFixed(0)} KB</p>
              </>
            ) : (
              <>
                <FileText size={20} className="text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-500 font-medium">PDF do Pedido</p>
                <p className="text-xs text-gray-400">clique ou arraste</p>
                <span className="text-xs text-red-400">obrigatório</span>
              </>
            )}
          </div>

          {/* Imagem */}
          <div
            onDrop={(e) => onDrop(e, 'imagem')}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !disabled && imgRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
              ${item.imagem ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <input ref={imgRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpdate({ imagem: e.target.files[0] })} />
            {item.imagem ? (
              <>
                <Image size={20} className="text-green-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-green-700 truncate">{item.imagem.name}</p>
                <p className="text-xs text-green-500">{(item.imagem.size / 1024).toFixed(0)} KB</p>
              </>
            ) : (
              <>
                <Image size={20} className="text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-500 font-medium">Imagem do Layout</p>
                <p className="text-xs text-gray-400">clique ou arraste</p>
                <span className="text-xs text-gray-300">opcional</span>
              </>
            )}
          </div>
        </div>

        {/* Observações */}
        <textarea
          rows={2}
          disabled={disabled || item.status !== 'aguardando'}
          placeholder="Observações (opcional) — ex: Urgente, Patch 3D, Não usar ribana..."
          value={item.observacoes}
          onChange={(e) => onUpdate({ observacoes: e.target.value })}
          className="input w-full text-sm resize-none disabled:opacity-50"
        />

        {/* Mensagem de erro */}
        {item.status === 'erro' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{item.mensagem}</p>
          </div>
        )}

        {/* Sucesso */}
        {item.status === 'sucesso' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle size={14} className="text-green-500" />
            <p className="text-xs text-green-700 font-medium">{item.mensagem}</p>
          </div>
        )}
      </div>
    </div>
  )
}
