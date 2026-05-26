import { clsx } from 'clsx'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/types'
import type { OrderStatus } from '@/types'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx('status-badge', ORDER_STATUS_COLORS[status])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}

export function UrgenciaBadge({ urgencia }: { urgencia: boolean }) {
  if (!urgencia) return null
  return (
    <span className="status-badge bg-red-100 text-red-700">
      Urgente
    </span>
  )
}
