import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Full7 | Sistema de Produção',
  description: 'Sistema automático de OP Full7 Uniformes Esportivos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
