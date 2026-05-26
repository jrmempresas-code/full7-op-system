'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ScrollText, RefreshCw, ExternalLink, Stethoscope, Upload, FileBarChart2,
} from 'lucide-react'
import { clsx } from 'clsx'

const nav = [
  { href: '/',        label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/pedidos', label: 'Pedidos',     icon: Package },
  { href: '/upload',  label: 'Novo Pedido', icon: Upload },
  { href: '/logs',    label: 'Logs',        icon: ScrollText },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-[#1a1a2e] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-full7-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">F7</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">FULL7</p>
            <p className="text-white/40 text-xs">Sistema de Produção</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-full7-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        <CheckEmailButton />
        <SyncTrelloButton />
        <WeeklyReportButton />
        <DiagnosticButton />
      </div>
    </aside>
  )
}

function CheckEmailButton() {
  async function handleCheck() {
    const res = await fetch('/api/email/check', { method: 'POST' })
    const data = await res.json()

    if (data.error) {
      alert(`❌ Erro ao verificar e-mails:\n\n${data.error}`)
      return
    }

    if (!data.details || data.details.length === 0) {
      alert(data.message ?? 'Nenhum e-mail novo encontrado')
      window.location.reload()
      return
    }

    // Montar resumo com detalhes de cada e-mail
    const lines: string[] = [`📬 ${data.message}`, '']
    for (const d of data.details) {
      const icon = d.success ? '✅' : '❌'
      lines.push(`${icon} ${d.subject ?? '(sem assunto)'}`)
      if (!d.success && d.error) {
        lines.push(`   Erro: ${d.error}`)
      }
    }

    alert(lines.join('\n'))
    window.location.reload()
  }

  return (
    <button
      onClick={handleCheck}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
    >
      <RefreshCw size={14} />
      Verificar E-mails
    </button>
  )
}

function SyncTrelloButton() {
  async function handleSync() {
    const res = await fetch('/api/trello/sync', { method: 'POST' })
    const data = await res.json()
    alert(data.message ?? data.error ?? 'Concluído')
    window.location.reload()
  }

  return (
    <button
      onClick={handleSync}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
    >
      <ExternalLink size={14} />
      Sincronizar Trello
    </button>
  )
}

function WeeklyReportButton() {
  async function handleSend() {
    if (!confirm('Enviar o relatório semanal agora para o e-mail configurado?')) return
    const res  = await fetch('/api/reports/weekly', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      alert(`✅ ${data.message}\n\nAtrasados: ${data.stats.atrasados} | Esta semana: ${data.stats.semana} | Próxima: ${data.stats.proximaSemana}`)
    } else {
      alert(`❌ Erro ao enviar relatório:\n\n${data.error}`)
    }
  }

  function handlePreview() {
    window.open('/api/reports/weekly', '_blank')
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={handleSend}
        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <FileBarChart2 size={14} />
        Relatório Semanal
      </button>
      <button
        onClick={handlePreview}
        title="Pré-visualizar relatório"
        className="px-2 py-2 rounded-lg text-xs text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
      >
        👁
      </button>
    </div>
  )
}

function DiagnosticButton() {
  async function handleDiag() {
    const res = await fetch('/api/test-pipeline')
    const data = await res.json()

    const lines: string[] = [data.status, '']
    for (const [key, val] of Object.entries(data.results as Record<string, { ok: boolean; detail: string }>)) {
      const icon = val.ok ? '✅' : '❌'
      lines.push(`${icon} ${key}: ${val.detail}`)
    }
    alert(lines.join('\n'))
  }

  return (
    <button
      onClick={handleDiag}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
    >
      <Stethoscope size={14} />
      Testar Conexões
    </button>
  )
}
