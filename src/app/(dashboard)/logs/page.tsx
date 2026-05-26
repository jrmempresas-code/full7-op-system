import { CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { getRecentLogs } from '@/lib/supabase/client'
import type { ProcessingLog } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LogsPage() {
  const logs = await getRecentLogs(100)

  const statusIcon = (status: ProcessingLog['status']) => {
    if (status === 'sucesso')      return <CheckCircle size={14} className="text-green-500" />
    if (status === 'erro')         return <AlertTriangle size={14} className="text-red-500" />
    return <Clock size={14} className="text-blue-500" />
  }

  const statusClass = (status: ProcessingLog['status']) => {
    if (status === 'sucesso')  return 'border-l-green-400 bg-green-50/30'
    if (status === 'erro')     return 'border-l-red-400 bg-red-50/30'
    return 'border-l-blue-400 bg-blue-50/30'
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Logs de Processamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">Últimas 100 entradas</p>
      </div>

      <div className="card divide-y divide-gray-50">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhum log encontrado</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`flex items-start gap-3 px-4 py-3 border-l-4 ${statusClass(log.status)}`}>
              <div className="flex-shrink-0 mt-0.5">{statusIcon(log.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {log.etapa.replace(/_/g, ' ')}
                  </span>
                  {log.order_id && (
                    <a
                      href={`/pedidos/${log.order_id}`}
                      className="text-xs text-full7-500 hover:underline"
                    >
                      Ver pedido
                    </a>
                  )}
                </div>
                {log.mensagem && (
                  <p className="text-sm text-gray-600 mt-0.5 break-words">{log.mensagem}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(log.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
