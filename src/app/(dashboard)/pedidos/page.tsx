'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, RefreshCw } from 'lucide-react'
import OrdersTable from '@/components/dashboard/OrdersTable'
import { StatusBadge } from '@/components/ui/Badge'
import type { Order, OrderStatus } from '@/types'
import { ORDER_STATUS_LABELS } from '@/types'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os Status' },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

export default function PedidosPage() {
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState('')
  const [urgencia, setUrgencia]   = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]     = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status)     params.set('status', status)
    if (urgencia)   params.set('urgencia', 'true')
    if (search)     params.set('cliente', search)
    if (dataInicio) params.set('data_inicio', dataInicio)
    if (dataFim)    params.set('data_fim', dataFim)

    const res = await fetch(`/api/orders?${params}`)
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }, [status, urgencia, search, dataInicio, dataFim])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Todos os Pedidos</h1>
        <button onClick={fetchOrders} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter size={14} />
          Filtros
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8"
              placeholder="Buscar cliente ou pedido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="date"
            className="input"
            placeholder="Data início"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <input
            type="date"
            className="input"
            placeholder="Data fim"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={urgencia}
            onChange={(e) => setUrgencia(e.target.checked)}
            className="rounded"
          />
          Apenas urgentes
        </label>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-400 text-sm">Carregando pedidos...</div>
      ) : (
        <div>
          <p className="text-xs text-gray-500 mb-2">{orders.length} pedido(s) encontrado(s)</p>
          <OrdersTable orders={orders} />
        </div>
      )}
    </div>
  )
}
