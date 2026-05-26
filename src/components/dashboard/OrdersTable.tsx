'use client'

import { useRouter } from 'next/navigation'
import { ExternalLink, AlertTriangle, FileText } from 'lucide-react'
import { StatusBadge, UrgenciaBadge } from '@/components/ui/Badge'
import type { Order } from '@/types'

interface Props {
  orders: Order[]
  title?: string
}

export default function OrdersTable({ orders, title }: Props) {
  const router = useRouter()

  if (orders.length === 0) {
    return (
      <div className="card p-8 text-center">
        {title && <h3 className="text-sm font-semibold text-gray-500 mb-4">{title}</h3>}
        <p className="text-gray-400 text-sm">Nenhum pedido encontrado</p>
      </div>
    )
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—'
    // Evita bug de fuso: parseia como data local
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
              <th className="table-header text-left">Entrega</th>
              <th className="table-header text-right">Qtd</th>
              <th className="table-header text-right">Valor</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-center">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((order) => {
              const days = daysUntil(order.data_entrega)
              const isLate    = days !== null && days < 0 && !['entregue', 'pronto'].includes(order.status)
              const isToday   = days === 0
              const isSoon    = days !== null && days > 0 && days <= 3

              let entregaColor = 'text-gray-700'
              let entregaLabel = ''
              if (isLate)  { entregaColor = 'text-red-600 font-bold';    entregaLabel = `(${Math.abs(days!)}d atraso)` }
              else if (isToday) { entregaColor = 'text-red-500 font-bold'; entregaLabel = '(HOJE)' }
              else if (isSoon)  { entregaColor = 'text-amber-600 font-semibold'; entregaLabel = `(${days}d)` }

              return (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/pedidos/${order.id}`)}
                  className="hover:bg-full7-50/40 cursor-pointer transition-colors"
                >
                  <td className="table-cell font-mono font-medium text-full7-600">
                    #{order.numero_pedido}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {order.urgencia && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                      <span className="font-medium text-gray-900">{order.cliente}</span>
                    </div>
                    <UrgenciaBadge urgencia={order.urgencia} />
                  </td>
                  <td className="table-cell">
                    <span className={entregaColor}>
                      {formatDate(order.data_entrega)}
                    </span>
                    {entregaLabel && (
                      <span className={`ml-1 text-xs ${entregaColor}`}>{entregaLabel}</span>
                    )}
                  </td>
                  <td className="table-cell text-right font-medium">{order.quantidade_total || '—'}</td>
                  <td className="table-cell text-right">
                    {order.valor_total
                      ? order.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '—'}
                  </td>
                  <td className="table-cell text-center">
                    <StatusBadge status={order.status} />
                  </td>
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
