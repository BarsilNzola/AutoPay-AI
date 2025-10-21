import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AutoPay AI - Smart Wallet Automation',
  description: 'Automate your on-chain tasks with AI-powered wallet automation. Set up recurring payments, automatic claims, and scheduled operations.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="app-body">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}