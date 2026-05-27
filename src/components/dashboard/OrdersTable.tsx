'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, AlertTriangle, FileText, Pencil, Check, X as XIcon } from 'lucide-react'
import { StatusBadge, UrgenciaBadge } from '@/components/ui/Badge'
import type { Order } from '@/types'

interface Props {
  orders:    Order[]
  title?:    string
  editable?: boolean   // permite editar data_entrega inline
  hideDate?: boolean   // esconde a coluna de data (ex: página Pedidos)
}

export default function OrdersTable({ orders, title, editable = false, hideDate = false }: Props) {
  const router = useRouter()

  // Estado local para atualização optimista após edição de data
  const [localOrders, setLocalOrders] = useState<Order[]>(orders)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState('')
  const [savingId,    setSavingId]    = useState<string | null>(null)

  // Sincroniza quando o pai passa novas orders (ex: refresh de página)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  if (orders !== localOrders && editingId === null && savingId === null) {
    // shallow check — só atualiza se não estiver editando
    setLocalOrders(orders)
  }

  function startEdit(o: Order, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(o.id)
    setEditingDate(o.data_entrega ?? '')
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(null)
  }

  async function saveDate(orderId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!editingDate) { setEditingId(null); return }
    setSavingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data_entrega: editingDate }),
      })
      if (res.ok) {
        setLocalOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, data_entrega: editingDate } : o)
        )
      }
    } finally {
      setSavingId(null)
      setEditingId(null)
    }
  }

  if (localOrders.length === 0) {
    return (
      <div className="card p-8 text-center">
        {title && <h3 className="text-sm font-semibold text-gray-500 mb-4">{title}</h3>}
        <p className="text-gray-400 text-sm">Nenhum pedido encontrado</p>
      </div>
    )
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—'
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  function daysUntil(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const dt    = new Date(dateStr + 'T00:00:00')
    return Math.round((dt.getTime() - today.getTime()) / 86400000)
  }

  return (
    <div className="card overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header text-left">Pedido</th>
              <th className="table-header text-left">Cliente</th>
              {!hideDate && <th className="table-header text-left">Entrega</th>}
              <th className="table-header text-right">Qtd</th>
              <th className="table-header text-right">Valor</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-center">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {localOrders.map((order) => {
              const days    = daysUntil(order.data_entrega)
              const isLate  = days !== null && days < 0 && !['entregue', 'pronto'].includes(order.status)
              const isToday = days === 0
              const isSoon  = days !== null && days > 0 && days <= 3
              const isEditing = editingId === order.id
              const isSaving  = savingId  === order.id

              let entregaColor = 'text-gray-700'
              let entregaLabel = ''
              if (isLate)       { entregaColor = 'text-red-600 font-bold';         entregaLabel = `(${Math.abs(days!)}d atraso)` }
              else if (isToday) { entregaColor = 'text-red-500 font-bold';         entregaLabel = '(HOJE)' }
              else if (isSoon)  { entregaColor = 'text-amber-600 font-semibold';   entregaLabel = `(${days}d)` }

              return (
                <tr
                  key={order.id}
                  onClick={() => !isEditing && router.push(`/pedidos/${order.id}`)}
                  className="hover:bg-full7-50/40 cursor-pointer transition-colors"
                >
                  {/* Número */}
                  <td className="table-cell font-mono font-medium text-full7-600">
                    #{order.numero_pedido}
                  </td>

                  {/* Cliente */}
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {order.urgencia && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                      <span className="font-medium text-gray-900">{order.cliente}</span>
                    </div>
                    <UrgenciaBadge urgencia={order.urgencia} />
                  </td>

                  {/* Data de entrega (editável ou só leitura) */}
                  {!hideDate && (
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            autoFocus
                            value={editingDate}
                            onChange={(e) => setEditingDate(e.target.value)}
                            className="input text-xs py-1 px-2 w-36"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => saveDate(order.id, e)}
                            disabled={isSaving}
                            className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-50"
                            title="Salvar"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 rounded text-gray-400 hover:bg-gray-100"
                            title="Cancelar"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`flex items-center gap-1 group ${editable ? 'cursor-pointer' : ''}`}
                          onClick={(e) => editable && startEdit(order, e)}
                        >
                          <span className={entregaColor}>
                            {formatDate(order.data_entrega)}
                          </span>
                          {entregaLabel && (
                            <span className={`text-xs ${entregaColor}`}>{entregaLabel}</span>
                          )}
                          {editable && (
                            <Pencil
                              size={11}
                              className="text-gray-300 group-hover:text-full7-400 transition-colors ml-1 flex-shrink-0"
                            />
                          )}
                        </div>
                      )}
                    </td>
                  )}

                  {/* Quantidade */}
                  <td className="table-cell text-right font-medium">
                    {order.quantidade_total || '—'}
                  </td>

                  {/* Valor */}
                  <td className="table-cell text-right">
                    {order.valor_total
                      ? order.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '—'}
                  </td>

                  {/* Status */}
                  <td className="table-cell text-center">
                    <StatusBadge status={order.status} />
                  </td>

                  {/* Links */}
                  <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {order.op_pdf_url && (
                        <a
                          href={order.op_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-full7-50 text-full7-500 transition-colors"
                          title="Ver OP (PDF)"
                        >
                          <FileText size={15} />
                        </a>
                      )}
                      {order.trello_card_url && (
                        <a
                          href={order.trello_card_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="Ver no Trello"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
