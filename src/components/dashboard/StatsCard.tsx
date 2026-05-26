import { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'orange' | 'red' | 'green' | 'blue' | 'yellow' | 'purple'
  urgent?: boolean
}

const colorMap = {
  orange: { bg: 'bg-full7-50',  icon: 'text-full7-500',  border: 'border-full7-200' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-500',    border: 'border-red-200'   },
  green:  { bg: 'bg-green-50',  icon: 'text-green-500',  border: 'border-green-200' },
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   border: 'border-blue-200'  },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-500', border: 'border-yellow-200'},
  purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-200'},
}

export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'orange', urgent }: StatsCardProps) {
  const c = colorMap[color]
  return (
    <div className={clsx('card p-5 border', c.border, urgent && 'ring-2 ring-red-400')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={clsx('p-2.5 rounded-xl', c.bg)}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
    </div>
  )
}
