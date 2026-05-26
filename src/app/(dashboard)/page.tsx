import { Suspense } from 'react'
import {
  Package, AlertTriangle, CheckCircle, Truck,
  Clock, DollarSign, Layers, Settings,
} from 'lucide-react'
import { getDashboardStats, getOrders, getUpcomingDeliveries } from '@/lib/supabase/client'
import StatsCard from '@/components/dashboard/StatsCard'
import OrdersTable from '@/components/dashboard/OrdersTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.length > 0 && !url.includes('xxxxxxxxxxxxxxxxxxxx')
}

function SetupBanner() {
  const checks = [
    { label: 'Supabase URL',       ok: !!(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').includes('supabase.co') && !(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').includes('xxx') },
    { label: 'Supabase Anon Key',  ok: !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').startsWith('eyJ') },
    { label: 'Trello API Key',     ok: !!(process.env.TRELLO_API_KEY) && process.env.TRELLO_API_KEY !== 'sua_api_key_aqui' },
    { label: 'Gmail Email',        ok: !!(process.env.GMAIL_EMAIL) && process.env.GMAIL_EMAIL !== 'seuemail@gmail.com' },
    { label: 'IA API Key',         ok: !!(process.env.AI_API_KEY) && process.env.AI_API_KEY !== 'sk-ant-api03-sua_chave_aqui' },
  ]
  const configured = checks.filter(c => c.ok).length

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <Settings size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            Configuração necessária — {configured}/{checks.length} integrações ativas
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Preencha o arquivo <code className="bg-amber-100 px-1 rounded">.env.local</code> com suas credenciais para ativar o sistema completo.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {checks.map(c => (
              <span key={c.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                c.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {c.ok ? '✓' : '✗'} {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

async function DashboardContent() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard de Produção</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full7 Uniformes Esportivos</p>
        </div>
        <SetupBanner />
        <div className="card p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-full7-50 rounded-2xl flex items-center justify-center mx-auto">
            <Package size={28} className="text-full7-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Sistema pronto para uso</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Configure as credenciais no <code className="bg-gray-100 px-1 rounded">.env.local</code> e reinicie o servidor com <code className="bg-gray-100 px-1 rounded">npm run dev</code>.
          </p>
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-left max-w-sm mx-auto">
            <p className="font-medium mb-1">Ordem de configuração:</p>
            <ol className="space-y-0.5 list-decimal list-inside">
              <li>Supabase → criar projeto + rodar SQL</li>
              <li>Trello → API Key + Token + IDs das listas</li>
              <li>Gmail → OAuth2 + Refresh Token</li>
              <li>Anthropic → chave de API</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  try {
    const [stats, atrasados, urgentes, entregas, prontos, incompletos] = await Promise.all([
      getDashboardStats(),
      getOrders({ status: 'atrasado' }),
      getOrders({ urgencia: true }),
      getUpcomingDeliveries(7),
      getOrders({ status: 'pronto' }),
      getOrders({ status: 'incompleto' }),
    ])

    const valorProd = Number(stats?.valor_em_producao ?? 0)

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard de Produção</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Atualizado em {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Sistema Ativo
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Em Produção"       value={stats?.em_producao ?? 0}      subtitle="pedidos ativos"       icon={Package}       color="orange" />
          <StatsCard title="Pedidos Atrasados" value={stats?.atrasados ?? 0}         subtitle="requer atenção"       icon={AlertTriangle}  color="red"    urgent={(stats?.atrasados ?? 0) > 0} />
          <StatsCard title="Prontos p/ Entrega" value={stats?.prontos ?? 0}          subtitle="aguardando retirada"  icon={CheckCircle}   color="green" />
          <StatsCard title="Urgentes"          value={stats?.urgentes ?? 0}           subtitle="prioridade máxima"    icon={AlertTriangle}  color="red"    urgent={(stats?.urgentes ?? 0) > 0} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatsCard title="Entregues no Mês"  value={stats?.entregues_mes ?? 0}                                                        icon={Truck}      color="purple" />
          <StatsCard title="Peças em Produção" value={(stats?.quantidade_total_pecas ?? 0).toLocaleString('pt-BR')}                     icon={Layers}     color="blue" />
          <StatsCard title="Valor em Produção" value={valorProd.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}       icon={DollarSign} color="green" />
        </div>

        {atrasados.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-500" />
              <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide">Pedidos Atrasados ({atrasados.length})</h2>
            </div>
            <OrdersTable orders={atrasados} />
          </div>
        )}

        {urgentes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-full7-500" />
              <h2 className="text-sm font-semibold text-full7-600 uppercase tracking-wide">Pedidos Urgentes ({urgentes.length})</h2>
            </div>
            <OrdersTable orders={urgentes} />
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Entregas nos Próximos 7 Dias ({entregas.length})</h2>
          </div>
          <OrdersTable orders={entregas} />
        </div>

        {incompletos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
                Pedidos Incompletos — Preencher Manualmente ({incompletos.length})
              </h2>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2 text-xs text-amber-700">
              Estes pedidos foram recebidos por e-mail mas a extração automática (IA) não estava disponível.
              Clique em cada pedido para preencher os dados manualmente.
            </div>
            <OrdersTable orders={incompletos} />
          </div>
        )}

        {prontos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-green-500" />
              <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide">Prontos para Entrega ({prontos.length})</h2>
            </div>
            <OrdersTable orders={prontos} />
          </div>
        )}
      </div>
    )
  } catch {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Dashboard de Produção</h1>
        <SetupBanner />
        <div className="card p-5 border-red-100 bg-red-50/50">
          <p className="text-sm font-medium text-red-700">Erro ao conectar com o Supabase</p>
          <p className="text-xs text-red-500 mt-1">
            Verifique se as credenciais do Supabase no <code>.env.local</code> estão corretas e se a migration SQL foi executada.
          </p>
        </div>
      </div>
    )
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="p-6 text-center text-gray-400">Carregando dashboard...</div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
