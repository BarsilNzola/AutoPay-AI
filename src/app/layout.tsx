import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AutoPay AI - Smart Wallet Assistant',
  description: 'Automate your on-chain tasks with AI-powered wallet automation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={inter.style}>
      <body style={{
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff)'
      }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}