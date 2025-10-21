'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi-config'
import { MetaMaskProvider } from '@metamask/sdk-react'
import { useState, useEffect } from 'react'

// Create a client outside the component to avoid re-creating on re-renders
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 2,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Enhanced loading component with coastal theme
  if (!mounted) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">AutoPay AI</p>
        </div>
        
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--color-background) 0%, var(--color-sand) 100%);
          }
          
          .loading-content {
            text-align: center;
          }
          
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid var(--color-ocean-100);
            border-top: 3px solid var(--color-ocean);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          
          .loading-text {
            color: var(--color-root-600);
            font-size: 1.125rem;
            font-weight: 500;
            font-family: var(--font-display);
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <MetaMaskProvider
      debug={process.env.NODE_ENV === 'development'}
      sdkOptions={{
        logging: {
          developerMode: process.env.NODE_ENV === 'development',
        },
        checkInstallationImmediately: false,
        dappMetadata: {
          name: "AutoPay AI",
          url: typeof window !== "undefined" ? window.location.href : "",
        }
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </MetaMaskProvider>
  )
}