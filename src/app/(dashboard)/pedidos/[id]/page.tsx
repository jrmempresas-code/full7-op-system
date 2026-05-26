'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, ExternalLink, RefreshCw, FileText,
  Image as ImageIcon, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react'
import { StatusBadge, UrgenciaBadge } from '@/components/ui/Badge'
import { ORDER_STATUS_LABELS } from '@/types'
import type { Order, ProcessingLog, OrderStatus } from '@/types'

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS) as Array<[OrderStatus, string]>

export default function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [order, setOrder]         = useState<Order | null>(null)
  const [logs, setLogs]           = useState<ProcessingLog[]>([])
  const [loading, setLoading]     = useState(true)
  const [reprocessing, setReproc] = useState(false)
  const [newStatus, setNewStatus] = useState<OrderStatus>('recebido')

  async function fetchData() {
    setLoading(true)
    const res = await fetch(`/api/orders/${id}`)
    const data = await res.json()
    if (data.order) {
      setOrder(data.order)
      setNewStatus(data.order.status)
    }
    setLogs(data.logs ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  async function handleReprocess() {
    if (!confirm('Reprocessar esta OP? A OP atual será regerada.')) return
    setReproc(true)
    const res = await fetch(`/api/orders/${id}/reprocess`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      alert('OP reprocessada com sucesso!')
      fetchData()
    } else {
      alert(`Erro: ${data.error}`)
    }
    setReproc(false)
  }

  async function handleStatusChange(status: OrderStatus) {
    setNewStatus(status)
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Carregando...</div>
  if (!order)  return <div className="p-6 text-center text-gray-400">Pedido não encontrado</div>

  const isLate = order.data_entrega &&
    new Date(order.data_entrega) < new Date() &&
    !['entregue', 'pronto'].includes(order.status)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              Pedido #{order.numero_pedido}
            </h1>
            <StatusBadge status={order.status} />
            <UrgenciaBadge urgencia={order.urgencia} />
            {isLate && (
              <span className="status-badge bg-red-100 text-red-700">ATRASADO</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{order.cliente}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mudar Status */}
          <select
            className="input w-auto text-sm"
            value={newStatus}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
          >
            {STATUS_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={reprocessing ? 'animate-spin' : ''} />
            {reprocessing ? 'Reprocessando...' : 'Reprocessar OP'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="col-span-2 space-y-4">
          {/* Dados do pedido */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Dados do Pedido</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Field label="Cliente"        value={order.cliente} />
              <Field label="Pedido"         value={`#${order.numero_pedido}`} />
              <Field label="Vendedor"       value={order.vendedor} />
              <Field label="Data do Pedido" value={order.data_pedido ? new Date(order.data_pedido).toLocaleDateString('pt-BR') : null} />
              <Field label="Entrega"        value={order.data_entrega ? new Date(order.data_entrega).toLocaleDateString('pt-BR') : null} className={isLate ? 'text-red-600 font-semibold' : undefined} />
              <Field label="Despachar até"  value={order.despachar_ate ? new Date(order.despachar_ate).toLocaleDateString('pt-BR') : null} />
            </div>
          </div>

          {/* Produto */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Produto e Componentes</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Field label="Produto"     value={order.produto} />
              <Field label="Modelo"      value={order.modelo} />
              <Field label="Tecido"      value={order.tecido} />
              <Field label="Composição"  value={order.composicao} />
              <Field label="Gola"        value={order.gola} />
              <Field label="Manga"       value={order.manga} />
              <Field label="Punho"       value={order.punho} />
              <Field label="Shorts"      value={order.shorts} />
              <Field label="Meião"       value={order.meiao} />
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Patch PET 3D</span>
                <p className={`font-medium mt-0.5 ${order.patch_3d ? 'text-full7-600' : 'text-gray-400'}`}>
                  {order.patch_3d ? 'SIM' : 'Não'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Ribana</span>
                <p className={`font-medium mt-0.5 ${order.ribana ? 'text-gray-700' : 'text-red-600'}`}>
                  {order.ribana ? 'Sim' : 'NÃO USAR'}
                </p>
              </div>
            </div>
          </div>

          {/* Grade */}
          {order.order_sizes && order.order_sizes.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Grade de Tamanhos</h2>
              <div className="flex flex-wrap gap-3">
                {order.order_sizes.map((s) => (
                  <div key={s.id} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[60px]">
                    <p className="text-xs font-semibold text-gray-500 uppercase">{s.tamanho}</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">{s.quantidade}</p>
                  </div>
                ))}
                <div className="bg-full7-50 border border-full7-200 rounded-lg px-4 py-3 text-center min-w-[80px]">
                  <p className="text-xs font-semibold text-full7-500 uppercase">Total</p>
                  <p className="text-xl font-bold text-full7-600 mt-0.5">{order.quantidade_total}</p>
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          {order.observacoes && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Observações</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                {order.observacoes}
              </p>
            </div>
          )}

          {/* Logs de processamento */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Log de Processamento</h2>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400">Sem logs</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    {log.status === 'sucesso' && <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />}
                    {log.status === 'erro'    && <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />}
                    {log.status === 'em_andamento' && <Clock size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">{log.etapa}</span>
                      {log.mensagem && <p className="text-gray-500 text-xs mt-0.5">{log.mensagem}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">
          {/* Valor */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Valor Total</h2>
            <p className="text-2xl font-bold text-full7-600">
              {order.valor_total
                ? order.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : '—'}
            </p>
            <p className="text-sm text-gray-500 mt-1">{order.quantidade_total} peças</p>
          </div>

          {/* Arquivos */}
          <div className="card p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Arquivos</h2>
            {order.op_pdf_url && (
              <a href={order.op_pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-full7-600 hover:text-full7-700 font-medium">
                <FileText size={14} />
                OP Gerada (PDF)
                <ExternalLink size={12} />
              </a>
            )}
            {order.pedido_pdf_url && (
              <a href={order.pedido_pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700 font-medium">
                <FileText size={14} />
                Pedido Original
                <ExternalLink size={12} />
              </a>
            )}
            {order.layout_image_url && (
              <a href={order.layout_image_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700 font-medium">
                <ImageIcon size={14} />
                Layout do Uniforme
                <ExternalLink size={12} />
              </a>
            )}
            {order.trello_card_url && (
              <a href={order.trello_card_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <ExternalLink size={14} />
                Card no Trello
              </a>
            )}
          </div>

          {/* Preview do layout */}
          {order.layout_image_url && (
            <div className="card overflow-hidden">
              <img
                src={order.layout_image_url}
                alt="Layout do uniforme"
                className="w-full object-contain bg-gray-50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <p className={`font-medium text-gray-900 mt-0.5 ${className ?? ''}`}>{value ?? '—'}</p>
    </div>
  )
}
